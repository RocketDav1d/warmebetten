"""
One-time script to populate unterkunft_email_whitelist from unterkuenfte.email arrays.

For each unterkunft with emails, creates one whitelist record per email.

Usage:
    # Dry run (no DB writes)
    python3 -m scripts.create_email_whitelist

    # Actually insert
    python3 -m scripts.create_email_whitelist --commit

Requires scripts/.env with:
    NEXT_PUBLIC_SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Any

import requests

# Allow running as module or directly
try:
    from scripts.env import load_dotenv
except ModuleNotFoundError:
    import sys

    repo_root = Path(__file__).resolve().parents[1]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from scripts.env import load_dotenv

import os

logger = logging.getLogger("create_email_whitelist")


def get_supabase_config() -> tuple[str, str]:
    """Load Supabase URL and service role key from env."""
    load_dotenv()
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in scripts/.env"
        )
    return url, key


def fetch_unterkuenfte_with_emails(url: str, key: str) -> list[dict[str, Any]]:
    """
    Fetch all unterkuenfte that have at least one email.
    Returns list of {id, email} where email is string[].
    """
    endpoint = f"{url}/rest/v1/unterkuenfte"
    params = {
        "select": "id,email",
        # Filter: email is not null (Supabase uses neq.null for array/jsonb)
        "email": "not.is.null",
    }
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    resp = requests.get(endpoint, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_existing_whitelist(url: str, key: str) -> set[tuple[str, str]]:
    """
    Fetch all existing (unterkunft_id, email) pairs from whitelist.
    Returns a set of tuples for fast lookup.
    """
    endpoint = f"{url}/rest/v1/unterkunft_email_whitelist"
    params = {"select": "unterkunft_id,email"}
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    resp = requests.get(endpoint, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    rows = resp.json()
    return {(r["unterkunft_id"], r["email"].lower().strip()) for r in rows}


def insert_whitelist_records(
    url: str, key: str, records: list[dict[str, str]]
) -> dict[str, Any]:
    """
    Insert whitelist records via Supabase REST API.
    records: list of {unterkunft_id, email}
    """
    endpoint = f"{url}/rest/v1/unterkunft_email_whitelist"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    resp = requests.post(endpoint, json=records, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Actually insert records. Without this flag, only a dry run is performed.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    url, key = get_supabase_config()
    logger.info("Supabase URL: %s", url)

    # Fetch unterkuenfte with emails
    unterkuenfte = fetch_unterkuenfte_with_emails(url, key)
    logger.info("Fetched %s unterkuenfte with email arrays", len(unterkuenfte))

    # Fetch existing whitelist to avoid duplicates
    existing = fetch_existing_whitelist(url, key)
    logger.info("Existing whitelist records: %s", len(existing))

    # Build list of new records to insert
    to_insert: list[dict[str, str]] = []
    skipped_existing = 0
    skipped_empty = 0

    for u in unterkuenfte:
        unterkunft_id = u.get("id")
        emails = u.get("email") or []

        if not isinstance(emails, list):
            # Shouldn't happen per schema, but be safe
            emails = [emails] if emails else []

        for email in emails:
            if not email or not isinstance(email, str):
                skipped_empty += 1
                continue

            email_normalized = email.lower().strip()
            if not email_normalized:
                skipped_empty += 1
                continue

            if (unterkunft_id, email_normalized) in existing:
                skipped_existing += 1
                logger.debug(
                    "Skipping existing: unterkunft=%s email=%s",
                    unterkunft_id,
                    email_normalized,
                )
                continue

            to_insert.append(
                {
                    "unterkunft_id": unterkunft_id,
                    "email": email_normalized,
                }
            )
            logger.debug(
                "Will insert: unterkunft=%s email=%s", unterkunft_id, email_normalized
            )

    logger.info(
        "Records to insert: %s | skipped (already exists): %s | skipped (empty): %s",
        len(to_insert),
        skipped_existing,
        skipped_empty,
    )

    if not to_insert:
        logger.info("Nothing to insert.")
        return

    if not args.commit:
        logger.info("Dry run mode. Use --commit to actually insert.")
        for r in to_insert[:10]:
            logger.info("  Would insert: %s", r)
        if len(to_insert) > 10:
            logger.info("  ... and %s more", len(to_insert) - 10)
        return

    # Insert in batches to avoid timeouts
    BATCH_SIZE = 50
    inserted = 0
    for i in range(0, len(to_insert), BATCH_SIZE):
        batch = to_insert[i : i + BATCH_SIZE]
        logger.info("Inserting batch %s-%s...", i + 1, i + len(batch))
        result = insert_whitelist_records(url, key, batch)
        inserted += len(result)
        logger.info("Inserted %s records", len(result))

    logger.info("Done. Total inserted: %s", inserted)


if __name__ == "__main__":
    main()

