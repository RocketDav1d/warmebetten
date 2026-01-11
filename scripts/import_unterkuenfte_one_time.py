from __future__ import annotations

import argparse
import json
import logging
import os
import re
import time as time_mod
from pathlib import Path
from typing import Any, Iterable

import requests

from scripts.env import load_dotenv

logger = logging.getLogger("import_unterkuenfte_one_time")

# Berlin bounding box: minLon,minLat,maxLon,maxLat (kept in sync with app/api/geocode/photon/route.ts)
BERLIN_BBOX = "13.0884,52.3383,13.7611,52.6755"
PHOTON_URL = "https://photon.komoot.io/api/"


def _load_extraction(path: str | Path) -> list[dict]:
    """
    Supports:
    - { "unterkuenfte": [ ... ] }
    - [ { "unterkuenfte": [ ... ] }, ... ]  (older chunked output)
    """
    p = Path(path)
    raw = json.loads(p.read_text(encoding="utf-8"))

    if isinstance(raw, dict):
        u = raw.get("unterkuenfte", [])
        return u if isinstance(u, list) else []

    if isinstance(raw, list):
        merged: list[dict] = []
        for obj in raw:
            if isinstance(obj, dict) and isinstance(obj.get("unterkuenfte"), list):
                merged.extend(obj["unterkuenfte"])
        return merged

    raise ValueError("Unexpected JSON format. Expected dict or list.")


def _dedupe(entries: Iterable[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for e in entries:
        name = str(e.get("name") or "").strip().lower()
        adresse = str(e.get("adresse") or "").strip().lower()
        telefon_raw = e.get("telefon")
        if isinstance(telefon_raw, list):
            telefon = ",".join(sorted(str(t).strip().lower() for t in telefon_raw if str(t).strip()))
        else:
            telefon = str(telefon_raw or "").strip().lower()
        key = "|".join([name, adresse, telefon]).strip("|")
        if not key:
            out.append(e)
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


_TIME_RE = re.compile(r"(?P<h>\\d{1,2})[:.](?P<m>\\d{2})(?:[:.](?P<s>\\d{2}))?")


def _normalize_pg_time(value: Any) -> str | None:
    """
    Postgres `time` columns want `HH:MM:SS`.
    The extraction may contain timezone offsets (e.g. '19:30:00+01:00') which we drop.
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    m = _TIME_RE.search(s)
    if not m:
        return None
    h = int(m.group("h"))
    mm = int(m.group("m"))
    ss = int(m.group("s") or 0)
    if not (0 <= h <= 23 and 0 <= mm <= 59 and 0 <= ss <= 59):
        return None
    return f"{h:02d}:{mm:02d}:{ss:02d}"


def _normalize_text_array(value: Any) -> list[str] | None:
    """
    Normalize values for Postgres `text[]` columns (e.g. telefon/email).
    Returns None to indicate "omit field" (so DB defaults apply).
    """
    if value is None:
        return None
    if isinstance(value, list):
        arr = [str(x).strip() for x in value if str(x).strip()]
        return arr or None

    s = str(value).strip()
    if not s:
        return None

    # allow simple "a, b; c" lists from extraction
    parts = [p.strip() for p in re.split(r"[;,]", s) if p.strip()]
    return parts or None


def geocode_photon(*, q: str, bbox: str = BERLIN_BBOX, limit: int = 6, timeout_s: int = 20) -> tuple[float, float] | None:
    q = q.strip()
    if len(q) < 3:
        return None

    params = {"q": q, "lang": "de", "limit": str(limit), "bbox": bbox}
    headers = {
        # Same intent as the Next.js route; keep fair-use clear.
        "user-agent": "warmebetten.berlin (photon geocoding)",
        "accept-language": "de",
    }
    res = requests.get(PHOTON_URL, params=params, headers=headers, timeout=timeout_s)
    res.raise_for_status()
    data = res.json()
    features = data.get("features") if isinstance(data, dict) else None
    if not isinstance(features, list):
        return None

    for f in features:
        if not isinstance(f, dict):
            continue
        geom = f.get("geometry")
        if not isinstance(geom, dict):
            continue
        coords = geom.get("coordinates")
        if (
            isinstance(coords, list)
            and len(coords) == 2
            and isinstance(coords[0], (int, float))
            and isinstance(coords[1], (int, float))
        ):
            lng = float(coords[0])
            lat = float(coords[1])
            return lat, lng
    return None


def _supabase_rest_insert(
    *,
    supabase_url: str,
    service_role_key: str,
    row: dict,
    timeout_s: int = 30,
    return_representation: bool = False,
) -> dict | None:
    endpoint = supabase_url.rstrip("/") + "/rest/v1/unterkuenfte"
    headers = {
        "apikey": service_role_key,
        "authorization": f"Bearer {service_role_key}",
        "content-type": "application/json",
        "prefer": "return=representation" if return_representation else "return=minimal",
    }
    res = requests.post(endpoint, headers=headers, json=row, timeout=timeout_s)
    if res.status_code >= 400:
        raise RuntimeError(f"Insert failed ({res.status_code}): {res.text}")
    if return_representation:
        try:
            data = res.json()
            return data[0] if isinstance(data, list) and data else (data if isinstance(data, dict) else None)
        except Exception:
            return None
    return None


def _build_insert_row(
    *,
    extracted: dict,
    lat: float | None,
    lng: float | None,
    default_typ: str | None,
) -> dict:
    """
    Build a clean insert payload for `public.unterkuenfte`.
    Omits None values so DB defaults/NOT NULL constraints work.
    """
    allowed_fields = {
        "bezirk",
        "typ",
        "name",
        "adresse",
        "strasse",
        "u_bahn_station",
        "s_bahn_station",
        "bus",
        "telefon",
        "email",
        "website",
        "verantwortliche_personen",
        "metadata",
        "oeffnung_von",
        "oeffnung_bis",
        "letzter_einlass",
        "kaelte_waerme_bus_kann_kommen_von",
        "kaelte_waerme_bus_kann_kommen_bis",
        "keine_drogen",
        "keine_tiere",
        "keine_gewalt",
        "bietet_dusche",
        "bietet_essen",
        "bietet_betreuung",
        "bietet_kleidung",
        "bietet_medizin",
        "behindertengerecht",
        "kapazitaet_max_allgemein",
        "kapazitaet_max_frauen",
        "kapazitaet_max_maenner",
        "plaetze_frei_aktuell",
    }
    time_fields = {
        "oeffnung_von",
        "oeffnung_bis",
        "letzter_einlass",
        "kaelte_waerme_bus_kann_kommen_von",
        "kaelte_waerme_bus_kann_kommen_bis",
    }

    row: dict[str, Any] = {}
    for k, v in extracted.items():
        if k not in allowed_fields:
            continue
        if v is None:
            continue
        if k in time_fields:
            t = _normalize_pg_time(v)
            if t is not None:
                row[k] = t
            continue
        if k in {"telefon", "email"}:
            arr = _normalize_text_array(v)
            if arr is not None:
                row[k] = arr
            continue
        if k == "verantwortliche_personen":
            if isinstance(v, list):
                row[k] = [str(x).strip() for x in v if str(x).strip()]
            elif isinstance(v, str) and v.strip():
                row[k] = [v.strip()]
            continue
        if k == "metadata":
            # DB column is text; if extraction gives structured JSON, serialize.
            if isinstance(v, (dict, list)):
                row[k] = json.dumps(v, ensure_ascii=False)
            else:
                s = str(v).strip()
                if s:
                    row[k] = s
            continue
        row[k] = v

    if default_typ and "typ" not in row:
        row["typ"] = default_typ

    if lat is not None and lng is not None:
        row["lat"] = float(lat)
        row["lng"] = float(lng)

    return row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_path", default="shelters.structured.json")
    parser.add_argument("--supabase-url", default=None, help="Defaults to NEXT_PUBLIC_SUPABASE_URL env var")
    parser.add_argument("--service-role-key", default=None, help="Defaults to SUPABASE_SERVICE_ROLE_KEY env var")
    parser.add_argument("--default-typ", default="notuebernachtung")
    parser.add_argument("--photon-sleep-ms", type=int, default=150, help="Sleep between Photon calls")
    parser.add_argument("--commit", action="store_true", help="Actually insert into Supabase (default: dry-run)")
    parser.add_argument(
        "--skip-ungeocodable",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Skip records when Photon returns no coordinates",
    )
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level), format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    # Load scripts/.env (user convention in this repo)
    load_dotenv()

    supabase_url = args.supabase_url or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    service_role_key = args.service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""

    if not supabase_url:
        raise RuntimeError("Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or pass --supabase-url")
    if not service_role_key:
        raise RuntimeError("Missing service role key. Set SUPABASE_SERVICE_ROLE_KEY or pass --service-role-key")

    entries = _dedupe(_load_extraction(args.in_path))
    logger.info("Loaded %s unique extracted unterkuenfte from %s", len(entries), args.in_path)

    inserted = 0
    skipped = 0
    failed = 0

    for idx, e in enumerate(entries, start=1):
        name = str(e.get("name") or "").strip()
        adresse = str(e.get("adresse") or "").strip()
        telefon_raw = e.get("telefon")
        if isinstance(telefon_raw, list):
            telefon = ", ".join(str(t).strip() for t in telefon_raw if str(t).strip())
        else:
            telefon = str(telefon_raw or "").strip()
        if not name or not adresse:
            logger.warning("Skipping %s/%s (missing name/adresse): name=%r adresse=%r", idx, len(entries), name, adresse)
            skipped += 1
            continue

        logger.info("(%s/%s) %s | %s | %s", idx, len(entries), name, adresse, telefon)

        coords = geocode_photon(q=adresse)
        if coords is None:
            msg = "Photon: no coordinates"
            if args.skip_ungeocodable:
                logger.warning("%s -> skipping", msg)
                skipped += 1
                continue
            logger.warning("%s -> inserting without coords (lat/lng omitted)", msg)
            lat = lng = None
        else:
            lat, lng = coords
            logger.info("Photon: lat=%s lng=%s", lat, lng)

        row = _build_insert_row(extracted=e, lat=lat, lng=lng, default_typ=args.default_typ)

        if not args.commit:
            logger.info("Dry-run: would insert keys=%s", sorted(row.keys()))
            continue

        try:
            _supabase_rest_insert(
                supabase_url=supabase_url,
                service_role_key=service_role_key,
                row=row,
                return_representation=False,
            )
            inserted += 1
            logger.info("Inserted.")
        except Exception as ex:
            failed += 1
            logger.error("Insert failed: %s", ex)

        time_mod.sleep(max(0, args.photon_sleep_ms) / 1000.0)

    logger.info("Done. inserted=%s skipped=%s failed=%s commit=%s", inserted, skipped, failed, args.commit)


if __name__ == "__main__":
    main()


