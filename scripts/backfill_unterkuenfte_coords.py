"""
Backfill lat/lng coordinates for unterkuenfte using Photon geocoding.

Why:
- Import from PDF may not have coordinates.
- `lat`/`lng` are nullable, so we can insert first and geocode later.

Behavior:
- Selects unterkuenfte with missing lat/lng and is_mobile=false
- Uses `adresse` (and optionally `strasse`) as query to Photon
- Updates lat/lng via Supabase REST API

Usage:
  # Dry-run (no DB writes)
  python -m scripts.backfill_unterkuenfte_coords

  # Actually update
  python -m scripts.backfill_unterkuenfte_coords --commit

Requires:
  - requests (pip install -r requirements.txt)
  - NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (from scripts/.env or exported)
"""

from __future__ import annotations

import argparse
import logging
import os
import time as time_mod
from pathlib import Path
from typing import Any

try:
    import requests
except ModuleNotFoundError:  # pragma: no cover
    requests = None  # type: ignore

# Allow running as module or directly
try:
    from scripts.env import load_dotenv
except ModuleNotFoundError:  # pragma: no cover
    import sys

    repo_root = Path(__file__).resolve().parents[1]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from scripts.env import load_dotenv

logger = logging.getLogger("backfill_unterkuenfte_coords")

# Berlin bounding box: minLon,minLat,maxLon,maxLat (kept in sync with app/api/geocode/photon/route.ts)
BERLIN_BBOX = "13.0884,52.3383,13.7611,52.6755"
PHOTON_URL = "https://photon.komoot.io/api/"


def _build_query_candidates(*, adresse: str, strasse: str) -> list[str]:
    """
    Photon works best with a clean single address.

    The extracted `adresse` sometimes contains extra notes like:
      "Turmstr. 21, 10559 Berlin | Großes ehemaliges ..."
    or multiple places like:
      "Alexanderplatz, Ostbahnhof"

    We generate a few cleaned candidates and try them in order.
    """
    candidates: list[str] = []

    def add(s: str) -> None:
        s = (s or "").strip()
        if not s:
            return
        if s not in candidates:
            candidates.append(s)

    raw_adresse = (adresse or "").strip()
    raw_strasse = (strasse or "").strip()

    if raw_adresse:
        # Strip appended notes / descriptions.
        first = raw_adresse.split("|", 1)[0].strip()
        first = first.split("\n", 1)[0].strip()
        add(first)

        # If it's multiple places without "Berlin", try forcing Berlin context.
        if "," in first and "Berlin" not in first:
            add(first.split(",", 1)[0].strip() + ", Berlin")

    if raw_strasse:
        add(raw_strasse)
        if "Berlin" not in raw_strasse and "," in raw_strasse:
            add(raw_strasse + ", Berlin")

    return candidates


def get_supabase_config() -> tuple[str, str]:
    # scripts/.env is a convenience; allow running with env vars already set.
    try:
        load_dotenv()
    except FileNotFoundError:  # pragma: no cover
        pass
    except PermissionError:  # pragma: no cover
        pass

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return url, key


def photon_geocode(*, q: str, bbox: str = BERLIN_BBOX, limit: int = 6, timeout_s: int = 20) -> tuple[float, float] | None:
    if requests is None:
        raise RuntimeError("Missing dependency: requests. Install requirements.txt (or pip install requests).")

    q = q.strip()
    if len(q) < 3:
        return None

    params = {"q": q, "lang": "de", "limit": str(limit), "bbox": bbox}
    headers = {
        "user-agent": "warmebetten.berlin (photon geocoding)",
        "accept-language": "de",
    }
    res = requests.get(PHOTON_URL, params=params, headers=headers, timeout=timeout_s)
    res.raise_for_status()
    data = res.json()
    feats = data.get("features") if isinstance(data, dict) else None
    if not isinstance(feats, list):
        return None

    for f in feats:
        if not isinstance(f, dict):
            continue
        geom = f.get("geometry")
        if not isinstance(geom, dict):
            continue
        coords = geom.get("coordinates")
        if isinstance(coords, list) and len(coords) == 2 and isinstance(coords[0], (int, float)) and isinstance(coords[1], (int, float)):
            lng = float(coords[0])
            lat = float(coords[1])
            return lat, lng
    return None


def fetch_targets(url: str, key: str, limit: int | None = None) -> list[dict[str, Any]]:
    if requests is None:
        raise RuntimeError("Missing dependency: requests. Install requirements.txt (or pip install requests).")

    endpoint = f"{url.rstrip('/')}/rest/v1/unterkuenfte"
    params: dict[str, str] = {
        "select": "id,name,adresse,strasse,lat,lng,is_mobile",
        "is_mobile": "eq.false",
        "lat": "is.null",
        "lng": "is.null",
        "order": "name.asc",
    }
    if limit is not None:
        params["limit"] = str(limit)

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    resp = requests.get(endpoint, params=params, headers=headers, timeout=60)
    resp.raise_for_status()
    rows = resp.json()
    return rows if isinstance(rows, list) else []


def update_coords(url: str, key: str, unterkunft_id: str, lat: float, lng: float) -> None:
    if requests is None:
        raise RuntimeError("Missing dependency: requests. Install requirements.txt (or pip install requests).")

    endpoint = f"{url.rstrip('/')}/rest/v1/unterkuenfte"
    params = {"id": f"eq.{unterkunft_id}"}
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    payload = {"lat": lat, "lng": lng}
    resp = requests.patch(endpoint, params=params, headers=headers, json=payload, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(f"Update failed ({resp.status_code}): {resp.text}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", action="store_true", help="Actually update rows (default: dry-run)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of rows processed")
    parser.add_argument("--photon-sleep-ms", type=int, default=150, help="Sleep between Photon calls")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level), format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    url, key = get_supabase_config()
    rows = fetch_targets(url, key, limit=args.limit)
    logger.info("Targets (missing coords, not mobile): %s", len(rows))

    updated = 0
    skipped = 0
    failed = 0

    for i, r in enumerate(rows, start=1):
        uid = str(r.get("id") or "")
        name = str(r.get("name") or "").strip()
        adresse = (r.get("adresse") or "") if isinstance(r.get("adresse"), str) else ""
        strasse = (r.get("strasse") or "") if isinstance(r.get("strasse"), str) else ""

        qs = _build_query_candidates(adresse=adresse, strasse=strasse)
        if not qs:
            skipped += 1
            logger.warning("(%s/%s) Skipping (no adresse/strasse): %s (%s)", i, len(rows), name, uid)
            continue

        coords = None
        used_q = None
        for q in qs:
            coords = photon_geocode(q=q)
            if coords is not None:
                used_q = q
                break
        if coords is None:
            skipped += 1
            logger.warning("(%s/%s) Photon: no coordinates for %s | tried=%s", i, len(rows), name, qs)
            continue

        lat, lng = coords
        logger.info("(%s/%s) %s -> lat=%s lng=%s (q=%s)", i, len(rows), name, lat, lng, used_q)

        if args.commit:
            try:
                update_coords(url, key, uid, lat, lng)
                updated += 1
            except Exception as ex:
                failed += 1
                logger.error("Update failed for %s (%s): %s", name, uid, ex)
        else:
            updated += 1

        time_mod.sleep(max(0, args.photon_sleep_ms) / 1000.0)

    logger.info("Done. would_update=%s skipped=%s failed=%s commit=%s", updated, skipped, failed, args.commit)


if __name__ == "__main__":
    main()


