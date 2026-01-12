"""
Scrape categorical capacity status (traffic light) from kaeltehilfe-berlin.de and
update `public.unterkuenfte` (Kaeltehilfe-specific columns only).

Why:
- Kaeltehilfe does NOT publish exact free-bed counts, only:
  - none   (red)
  - little (yellow/orange)
  - plenty (green)
- It can also differentiate by gender (men/women/diverse) and an overall status.

Source list (Notübernachtung only):
  https://kaeltehilfe-berlin.de/angebote/filter/1?start=0

Usage:
  # Dry-run (no DB writes)
  python -m scripts.scrape_kaeltehilfe_capacity

  # Actually update Supabase
  python -m scripts.scrape_kaeltehilfe_capacity --commit

Requires:
  - requests, beautifulsoup4 (pip install -r requirements.txt)
  - NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (from scripts/.env or exported)
"""

from __future__ import annotations

import argparse
import difflib
import json
import logging
import os
import re
import time as time_mod
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

try:
    import requests
except ModuleNotFoundError:  # pragma: no cover
    requests = None  # type: ignore

try:
    from bs4 import BeautifulSoup  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    BeautifulSoup = None  # type: ignore

# Allow running both as module and directly.
try:
    from scripts.env import load_dotenv
except ModuleNotFoundError:  # pragma: no cover
    import sys

    repo_root = Path(__file__).resolve().parents[1]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from scripts.env import load_dotenv

logger = logging.getLogger("scrape_kaeltehilfe_capacity")

KAEHLTEHILFE_BASE = "https://kaeltehilfe-berlin.de"
NOTUEBERNACHTUNG_LIST_URL = f"{KAEHLTEHILFE_BASE}/angebote/filter/1"

# Words that are very common in offer names and don't help matching.
_MATCH_STOPWORDS: set[str] = {
    "notuebernachtung",
    "notubernaechtiung",
    "notubernachtung",
    "nachtcafe",
    "tagesangebote",
    "beratung",
    "hygiene",
    "medizinische",
    "hilfen",
    "essen",
    "verpflegung",
    "kleiderkammer",
    "suchtangebote",
    "fuer",
    "fur",
    "in",
    "am",
    "an",
    "im",
    "bei",
    "auf",
    "der",
    "die",
    "das",
    "und",
    "oder",
    "vom",
    "von",
    "zum",
    "zur",
    "des",
    "den",
    "mit",
    "ohne",
    "nur",
    "alle",
    "frauen",
    "maenner",
    "manner",
    "divers",
    "geschlechter",
    "familien",
    "wohnungslose",
    "wohnungslosem",
    "obdachlose",
    "obdachlosen",
}


CapacityStatus = str  # "none" | "little" | "plenty"


@dataclass(frozen=True)
class ScrapedOffer:
    name: str
    url: str | None
    status_all: CapacityStatus | None
    status_men: CapacityStatus | None
    status_women: CapacityStatus | None
    status_diverse: CapacityStatus | None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_overrides() -> dict[str, str]:
    """
    Load manual overrides from `scripts/kaeltehilfe_overrides.json`.

    Format:
      {
        "by_unterkunft_id": {
          "<uuid>": "https://kaeltehilfe-berlin.de/kaeltehilfe-angebot/<slug>"
        }
      }
    """
    path = _repo_root() / "scripts" / "kaeltehilfe_overrides.json"
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception as ex:  # pragma: no cover
        logger.warning("Failed to parse overrides JSON (%s): %s", path, ex)
        return {}

    if not isinstance(raw, dict):
        return {}
    by_id = raw.get("by_unterkunft_id")
    if not isinstance(by_id, dict):
        return {}
    out: dict[str, str] = {}
    for k, v in by_id.items():
        kid = str(k).strip()
        url = str(v).strip() if v is not None else ""
        if kid and url:
            out[kid] = url
    return out


def _normalize_name(name: str) -> str:
    """
    Normalize names for stable matching between our DB and Kaeltehilfe listing.
    """
    s = (name or "").strip().lower()
    if not s:
        return ""

    # German-specific replacements before stripping diacritics.
    s = (
        s.replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
    )

    # Remove remaining diacritics.
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))

    # Normalize punctuation/whitespace.
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _match_tokens(name: str) -> set[str]:
    n = _normalize_name(name)
    if not n:
        return set()
    toks = {t for t in n.split(" ") if t}
    # Remove very common boilerplate words.
    toks = {t for t in toks if t not in _MATCH_STOPWORDS}
    return toks


def _best_offer_match(*, db_name: str, offers: list[ScrapedOffer], offers_by_norm: dict[str, ScrapedOffer]) -> tuple[ScrapedOffer | None, str]:
    """
    Match a DB name to a Kaeltehilfe offer.

    Strategy:
    1) exact match on normalized full name
    2) token containment match on "significant" tokens (stopwords removed)
    3) fuzzy match (SequenceMatcher) as a last resort
    """
    db_norm = _normalize_name(db_name)
    if not db_norm:
        return None, "empty"

    direct = offers_by_norm.get(db_norm)
    if direct is not None:
        return direct, "direct"

    db_tokens = _match_tokens(db_name)
    if db_tokens:
        candidates: list[ScrapedOffer] = []
        for o in offers:
            o_tokens = _match_tokens(o.name)
            if db_tokens.issubset(o_tokens):
                candidates.append(o)
        if len(candidates) == 1:
            return candidates[0], "tokens"
        if len(candidates) > 1:
            # Pick the closest by fuzzy ratio on the normalized full string.
            best = max(
                candidates,
                key=lambda o: difflib.SequenceMatcher(None, db_norm, _normalize_name(o.name)).ratio(),
            )
            return best, "tokens_ambiguous"

    # Last resort fuzzy match on full normalized name.
    best_offer: ScrapedOffer | None = None
    best_ratio = 0.0
    for o in offers:
        r = difflib.SequenceMatcher(None, db_norm, _normalize_name(o.name)).ratio()
        if r > best_ratio:
            best_ratio = r
            best_offer = o
    if best_offer is not None and best_ratio >= 0.78:
        return best_offer, f"fuzzy:{best_ratio:.2f}"

    return None, "none"


def _parse_status_from_alt(alt: str | None) -> CapacityStatus | None:
    if not alt:
        return None
    a = alt.strip().lower()
    if not a:
        return None
    if "keine plätze" in a:
        return "none"
    if "wenige plätze" in a:
        return "little"
    if "viele plätze" in a:
        return "plenty"
    return None


def _scrape_page(html: str) -> list[ScrapedOffer]:
    if BeautifulSoup is None:
        raise RuntimeError("Missing dependency: beautifulsoup4. Install requirements.txt (pip install -r requirements.txt).")

    soup = BeautifulSoup(html, "html.parser")

    # Cards have class "el-item ... uk-card ..."
    def _is_card_class(c: Any) -> bool:
        if not c:
            return False
        if isinstance(c, str):
            parts = c.split()
        elif isinstance(c, list):
            parts = [str(x) for x in c]
        else:
            return False
        return ("el-item" in parts) and ("uk-card" in parts)

    cards = soup.find_all("div", class_=_is_card_class)
    out: list[ScrapedOffer] = []

    for card in cards:
        a = card.select_one("h3.el-title a")
        if not a:
            continue

        name = a.get_text(" ", strip=True)
        href = a.get("href")
        url = urljoin(KAEHLTEHILFE_BASE, str(href)) if href else None

        status_all: CapacityStatus | None = None
        status_men: CapacityStatus | None = None
        status_women: CapacityStatus | None = None
        status_diverse: CapacityStatus | None = None

        for img in card.select("div.fs-grid-nested-2 img"):
            alt = img.get("alt")
            status = _parse_status_from_alt(alt)
            if status is None:
                continue

            alt_l = str(alt).lower() if alt is not None else ""
            if "männer" in alt_l or "maenner" in alt_l:
                status_men = status
            elif "frauen" in alt_l:
                status_women = status
            elif "divers" in alt_l:
                status_diverse = status
            else:
                status_all = status

        out.append(
            ScrapedOffer(
                name=name,
                url=url,
                status_all=status_all,
                status_men=status_men,
                status_women=status_women,
                status_diverse=status_diverse,
            )
        )

    return out


def _http_get(url: str, *, params: dict[str, str] | None = None, timeout_s: int = 30) -> str:
    if requests is None:
        raise RuntimeError("Missing dependency: requests. Install requirements.txt (pip install -r requirements.txt).")

    logger.debug("HTTP GET %s params=%s timeout_s=%s", url, params, timeout_s)
    headers = {
        "user-agent": "warmebetten.berlin (kaeltehilfe capacity scraper; once daily)",
        "accept-language": "de",
        "accept": "text/html,application/xhtml+xml",
    }
    resp = requests.get(url, params=params, headers=headers, timeout=timeout_s)
    resp.raise_for_status()
    return resp.text


def scrape_all_offers(*, sleep_ms: int = 200, page_size: int = 10, max_pages: int = 200) -> list[ScrapedOffer]:
    """
    Paginate through the Notübernachtung listing by increasing `start`.

    Kaeltehilfe uses `start` as an offset (start=0,10,20,30,...) so we advance
    by a fixed page_size (default 10) and stop when a page returns no cards.
    """
    offers: list[ScrapedOffer] = []
    start = 0
    seen_offer_keys: set[str] = set()
    prev_page_signature: tuple[str, ...] | None = None

    for _page in range(max_pages):
        if start == 0:
            logger.info("Fetching first page (start=%s)...", start)
        else:
            logger.debug("Fetching page (start=%s)...", start)
        html = _http_get(NOTUEBERNACHTUNG_LIST_URL, params={"start": str(start)})
        page_offers = _scrape_page(html)
        if not page_offers:
            logger.info("Pagination finished at start=%s (no more cards).", start)
            break

        if start == 0:
            logger.info("First page parsed: %s offers", len(page_offers))
        else:
            logger.debug("Page parsed (start=%s): %s offers", start, len(page_offers))

        # Detect pagination "clamping" / repeats: sometimes start>last_page repeats the last page.
        # We stop if the whole page is identical to the previous page OR if it contains no new offers.
        page_keys: list[str] = []
        for o in page_offers:
            # Prefer stable url; fall back to normalized name.
            key = (o.url or "").strip().lower()
            if not key:
                key = _normalize_name(o.name)
            page_keys.append(key)
        page_signature = tuple(page_keys)

        if prev_page_signature is not None and page_signature == prev_page_signature:
            logger.info("Pagination stopped at start=%s (page repeats previous page).", start)
            break

        new_count = 0
        for o, key in zip(page_offers, page_keys, strict=False):
            if not key:
                # Extremely defensive: if we can't key it, still keep it.
                offers.append(o)
                new_count += 1
                continue
            if key in seen_offer_keys:
                continue
            seen_offer_keys.add(key)
            offers.append(o)
            new_count += 1

        if new_count == 0:
            logger.info("Pagination stopped at start=%s (no new unique offers; likely clamped to last page).", start)
            break

        prev_page_signature = page_signature
        start += max(1, int(page_size))

        time_mod.sleep(max(0, sleep_ms) / 1000.0)

    return offers


def get_supabase_config() -> tuple[str, str]:
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


def fetch_db_unterkuenfte(url: str, key: str, *, typ: str = "notuebernachtung") -> list[dict[str, Any]]:
    if requests is None:
        raise RuntimeError("Missing dependency: requests. Install requirements.txt (pip install -r requirements.txt).")

    endpoint = f"{url.rstrip('/')}/rest/v1/unterkuenfte"
    params: dict[str, str] = {
        "select": "id,name,typ",
        "order": "name.asc",
        "limit": "10000",
    }
    if typ:
        params["typ"] = f"eq.{typ}"

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    resp = requests.get(endpoint, params=params, headers=headers, timeout=60)
    resp.raise_for_status()
    rows = resp.json()
    return rows if isinstance(rows, list) else []


def patch_unterkunft(url: str, key: str, unterkunft_id: str, payload: dict[str, Any]) -> None:
    if requests is None:
        raise RuntimeError("Missing dependency: requests. Install requirements.txt (pip install -r requirements.txt).")

    endpoint = f"{url.rstrip('/')}/rest/v1/unterkuenfte"
    params = {"id": f"eq.{unterkunft_id}"}
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    resp = requests.patch(endpoint, params=params, headers=headers, json=payload, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(f"Update failed ({resp.status_code}): {resp.text}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", action="store_true", help="Actually update rows (default: dry-run)")
    parser.add_argument("--typ", default="notuebernachtung", help="DB typ to update (default: notuebernachtung)")
    parser.add_argument("--sleep-ms", type=int, default=200, help="Sleep between list page fetches")
    parser.add_argument("--page-size", type=int, default=10, help="Kaeltehilfe pagination step for start=0,10,20,...")
    parser.add_argument("--max-pages", type=int, default=200, help="Safety limit for pagination")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of DB rows processed")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level), format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    url, key = get_supabase_config()

    logger.info("Scraping Kaeltehilfe list: %s", NOTUEBERNACHTUNG_LIST_URL)
    offers = scrape_all_offers(sleep_ms=args.sleep_ms, page_size=args.page_size, max_pages=args.max_pages)
    logger.info("Scraped %s offers from Kaeltehilfe", len(offers))

    # Index offers by normalized name.
    offers_by_norm: dict[str, ScrapedOffer] = {}
    offers_by_url: dict[str, ScrapedOffer] = {}
    dupes = 0
    for o in offers:
        if o.url:
            u = o.url.strip().lower()
            if u and u not in offers_by_url:
                offers_by_url[u] = o
        k = _normalize_name(o.name)
        if not k:
            continue
        if k in offers_by_norm:
            dupes += 1
            continue
        offers_by_norm[k] = o
    if dupes:
        logger.warning("Kaeltehilfe listing contained %s duplicate normalized names; keeping first occurrence", dupes)

    overrides_by_id = _load_overrides()
    if overrides_by_id:
        logger.info("Loaded %s manual overrides from scripts/kaeltehilfe_overrides.json", len(overrides_by_id))

    rows = fetch_db_unterkuenfte(url, key, typ=args.typ)
    if args.limit is not None:
        rows = rows[: max(0, args.limit)]
    logger.info("DB targets: %s rows (typ=%s)", len(rows), args.typ)

    updated = 0
    unmatched = 0
    failed = 0
    checked_at = _now_iso()

    for i, r in enumerate(rows, start=1):
        uid = str(r.get("id") or "")
        name = str(r.get("name") or "").strip()
        if not uid or not name:
            continue

        # 1) Manual override by unterkunft_id -> Kaeltehilfe URL
        override_url = overrides_by_id.get(uid)
        offer: ScrapedOffer | None = None
        match_kind = "none"
        if override_url:
            offer = offers_by_url.get(override_url.strip().lower())
            if offer is None:
                logger.warning(
                    "(%s/%s) Override URL not found in scraped offers: id=%s name=%r url=%r",
                    i,
                    len(rows),
                    uid,
                    name,
                    override_url,
                )
            else:
                match_kind = "override"

        # 2) Automatic match (name-based)
        if offer is None:
            offer, match_kind = _best_offer_match(db_name=name, offers=offers, offers_by_norm=offers_by_norm)

        if offer is None:
            unmatched += 1
            logger.warning("(%s/%s) No Kaeltehilfe match for: %r (norm=%r)", i, len(rows), name, _normalize_name(name))
            continue

        if match_kind != "direct":
            logger.info("(%s/%s) Matched via %s: %r -> %r", i, len(rows), match_kind, name, offer.name)

        payload: dict[str, Any] = {
            "kaeltehilfe_capacity_status": offer.status_all,
            "kaeltehilfe_capacity_status_men": offer.status_men,
            "kaeltehilfe_capacity_status_women": offer.status_women,
            "kaeltehilfe_capacity_status_diverse": offer.status_diverse,
            "kaeltehilfe_capacity_url": offer.url,
            "kaeltehilfe_capacity_checked_at": checked_at,
        }

        logger.info(
            "(%s/%s) %s -> all=%s men=%s women=%s diverse=%s",
            i,
            len(rows),
            name,
            offer.status_all,
            offer.status_men,
            offer.status_women,
            offer.status_diverse,
        )

        if args.commit:
            try:
                patch_unterkunft(url, key, uid, payload)
                updated += 1
            except Exception as ex:
                failed += 1
                logger.error("Update failed for %s (%s): %s", name, uid, ex)
        else:
            updated += 1

    logger.info("Done. updated=%s unmatched=%s failed=%s commit=%s", updated, unmatched, failed, args.commit)


if __name__ == "__main__":
    main()


