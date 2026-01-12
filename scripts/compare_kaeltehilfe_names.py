"""
Compare our DB "notuebernachtung" names against Kaeltehilfe listing page names.

What it does:
- Fetches all `public.unterkuenfte` with typ=notuebernachtung from Supabase
- Fetches Kaeltehilfe offer cards from:
    https://kaeltehilfe-berlin.de/angebote/filter/1?start=0
  and subsequent pages using start=10 increments, probing start=40 by default.
- Writes a JSON report (names + normalized names + suggested matches).

Usage:
  python -m scripts.compare_kaeltehilfe_names --out tmp_logs/kaeltehilfe_name_compare.json

Requires:
  - requests, beautifulsoup4
  - NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
    (from scripts/.env or exported env vars)
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from scripts.env import load_dotenv
from scripts.scrape_kaeltehilfe_capacity import (
    NOTUEBERNACHTUNG_LIST_URL,
    _best_offer_match,
    _http_get,
    _normalize_name,
    _scrape_page,
    fetch_db_unterkuenfte,
    get_supabase_config,
)

logger = logging.getLogger("compare_kaeltehilfe_names")


def _utc_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_kaeltehilfe_pages(*, starts: list[int], timeout_s: int = 30) -> dict[str, Any]:
    """
    Fetch pages for the given `starts` list, stopping early if:
    - a page is empty
    - a page repeats the previous page (pagination clamping)
    """
    pages: list[dict[str, Any]] = []
    prev_signature: tuple[str, ...] | None = None

    for start in starts:
        html = _http_get(NOTUEBERNACHTUNG_LIST_URL, params={"start": str(start)}, timeout_s=timeout_s)
        offers = _scrape_page(html)
        keys = []
        for o in offers:
            key = (o.url or "").strip().lower() or _normalize_name(o.name)
            keys.append(key)
        sig = tuple(keys)

        pages.append(
            {
                "start": start,
                "count": len(offers),
                "offers": [
                    {
                        "name": o.name,
                        "norm": _normalize_name(o.name),
                        "url": o.url,
                    }
                    for o in offers
                ],
            }
        )

        if not offers:
            logger.info("Stopping: start=%s returned 0 offers.", start)
            break

        if prev_signature is not None and sig == prev_signature:
            logger.info("Stopping: start=%s repeats previous page (pagination clamped).", start)
            break

        prev_signature = sig

    # Flatten unique offers across fetched pages
    seen: set[str] = set()
    unique_offers: list[dict[str, Any]] = []
    for p in pages:
        for o in p["offers"]:
            key = (o["url"] or "").strip().lower() or o["norm"]
            if not key:
                continue
            if key in seen:
                continue
            seen.add(key)
            unique_offers.append(o)

    return {"pages": pages, "unique_offers_count": len(unique_offers)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--typ", default="notuebernachtung")
    parser.add_argument("--starts", default="0,10,20,30,40", help="Comma-separated start offsets to fetch")
    parser.add_argument("--timeout-s", type=int, default=30)
    parser.add_argument("--out", default="tmp_logs/kaeltehilfe_name_compare.json")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level), format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    # Load scripts/.env if present (repo convention)
    try:
        load_dotenv()
    except Exception:
        pass

    supabase_url, service_role_key = get_supabase_config()

    starts = [int(x.strip()) for x in args.starts.split(",") if x.strip()]

    logger.info("Fetching DB unterkuenfte typ=%s ...", args.typ)
    db_rows = fetch_db_unterkuenfte(supabase_url, service_role_key, typ=args.typ)
    db_names = [{"id": r["id"], "name": r["name"], "norm": _normalize_name(r["name"])} for r in db_rows if r.get("id") and r.get("name")]
    logger.info("DB rows: %s", len(db_names))

    logger.info("Fetching Kaeltehilfe pages: %s", starts)
    kaeltehilfe = fetch_kaeltehilfe_pages(starts=starts, timeout_s=args.timeout_s)
    pages = kaeltehilfe["pages"]

    # Build offer lists for matching (same logic as scraper)
    all_offers = []
    for p in pages:
        for o in p["offers"]:
            all_offers.append(
                # Minimal shape compatible with ScrapedOffer usage inside matcher:
                # we only use .name and .url for matching in _best_offer_match.
                type("Offer", (), {"name": o["name"], "url": o.get("url")})()  # type: ignore
            )

    offers_by_norm = {}
    for o in all_offers:
        k = _normalize_name(o.name)
        if k and k not in offers_by_norm:
            offers_by_norm[k] = o

    # Suggested matches
    matches = []
    unmatched = []
    for r in db_names:
        offer, kind = _best_offer_match(db_name=r["name"], offers=all_offers, offers_by_norm=offers_by_norm)  # type: ignore[arg-type]
        if offer is None:
            unmatched.append(r)
        else:
            matches.append(
                {
                    "db_id": r["id"],
                    "db_name": r["name"],
                    "db_norm": r["norm"],
                    "kaeltehilfe_name": offer.name,
                    "kaeltehilfe_norm": _normalize_name(offer.name),
                    "kaeltehilfe_url": getattr(offer, "url", None),
                    "match_kind": kind,
                }
            )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    report = {
        "generated_at": _utc_ts(),
        "db": {
            "typ": args.typ,
            "count": len(db_names),
            "names": db_names,
        },
        "kaeltehilfe": kaeltehilfe,
        "matches": {
            "count": len(matches),
            "rows": matches,
        },
        "unmatched": {
            "count": len(unmatched),
            "rows": unmatched,
        },
    }

    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Wrote report: %s", out_path)
    logger.info("Matches=%s Unmatched=%s", len(matches), len(unmatched))


if __name__ == "__main__":
    main()


