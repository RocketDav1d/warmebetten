from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Iterable, Type

from pydantic import BaseModel

# Allow running both as:
#   python -m scripts.extract_shelters_structured
# and (fallback):
#   python scripts/extract_shelters_structured.py
try:
    from scripts.openai_structured import call_openai_structured
    from scripts.pdf_text import pdf_to_pages_text
except ModuleNotFoundError:  # pragma: no cover
    import sys

    repo_root = Path(__file__).resolve().parents[1]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from scripts.openai_structured import call_openai_structured
    from scripts.pdf_text import pdf_to_pages_text


def _load_schema(schema_ref: str) -> Type[BaseModel]:
    """
    Load a Pydantic model via 'module:ClassName', e.g. 'scripts.schema_example:ShelterExtraction'
    """
    if ":" not in schema_ref:
        raise ValueError("schema must be in the form 'module:ClassName'")
    module_name, class_name = schema_ref.split(":", 1)

    mod = __import__(module_name, fromlist=[class_name])
    cls = getattr(mod, class_name)
    if not isinstance(cls, type) or not issubclass(cls, BaseModel):
        raise TypeError(f"{schema_ref} is not a Pydantic BaseModel subclass")
    return cls


DEFAULT_SYSTEM_PROMPT = """\
Du extrahierst aus einem Berliner Kältehilfe-Wegweiser die relevanten UNTERKÜNFTE (Notübernachtungen etc.).

Wichtige Regeln:
- Gib ausschließlich JSON zurück, das exakt dem vorgegebenen Schema entspricht (strict).
- Extrahiere nur Informationen, die im Text explizit vorkommen. Nichts erfinden.
- Wenn ein Feld nicht im Text steht, nutze null.
- Normalisiere Telefonnummern nicht aggressiv; übernimm sie möglichst originalgetreu.
"""

logger = logging.getLogger("extract_shelters_structured")


def _to_jsonable(model: BaseModel) -> dict:
    """
    Convert a Pydantic model to JSON-serializable Python types (e.g. time -> "HH:MM:SS").
    Supports Pydantic v2 and v1.
    """
    if hasattr(model, "model_dump"):  # pydantic v2
        return model.model_dump(mode="json")  # type: ignore[call-arg]
    # pydantic v1: `.dict()` may contain datetime/time objects; use `.json()`
    return json.loads(model.json())  # type: ignore[attr-defined]


def _as_list(obj: Any, key: str) -> list[dict]:
    """
    Extract a list field from a pydantic model (v1/v2) or dict.
    """
    if isinstance(obj, dict):
        val = obj.get(key)
    else:
        val = getattr(obj, key, None)
    return val if isinstance(val, list) else []


def _dedupe_entries(entries: Iterable[dict]) -> list[dict]:
    """
    Dedupe by a conservative key (name+adresse+telefon), case/whitespace-insensitive.
    """
    seen: set[str] = set()
    out: list[dict] = []
    for e in entries:
        name = (e.get("name") or "").strip().lower()
        adresse = (e.get("adresse") or "").strip().lower()
        telefon = (e.get("telefon") or "").strip().lower()
        key = "|".join([name, adresse, telefon]).strip("|")
        if not key:
            # If everything is missing, keep it (shouldn't happen with strict schema)
            out.append(e)
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", default="shelter.pdf")
    parser.add_argument("--schema", default="scripts.schema_example:UnterkuenfteExtraction")
    parser.add_argument("--model", default="gpt-4o-2024-08-06")
    parser.add_argument("--out", default="shelters.structured.json")
    parser.add_argument("--start-page", type=int, default=4, help="1-indexed, inclusive")
    parser.add_argument("--end-page", type=int, default=24, help="1-indexed, inclusive")
    parser.add_argument("--min-page-chars", type=int, default=200, help="Skip pages with less extracted text")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    schema_cls = _load_schema(args.schema)
    logger.info("Schema: %s", args.schema)
    logger.info("Model: %s", args.model)
    pages = pdf_to_pages_text(args.pdf)
    logger.info("PDF pages: %s (%s)", len(pages), args.pdf)

    start = max(1, args.start_page)
    end = min(len(pages), args.end_page)
    if start > end:
        raise ValueError(f"Invalid page range: start={args.start_page} end={args.end_page} for pdf with {len(pages)} pages")

    logger.info("Processing pages %s..%s (inclusive)", start, end)

    merged: list[dict] = []
    called = 0
    skipped = 0

    for page_no in range(start, end + 1):
        logger.info("Page %s/%s", page_no, end)
        page_text = (pages[page_no - 1] or "").strip()
        if len(page_text) < args.min_page_chars:
            logger.info("Skipping page %s (only %s chars)", page_no, len(page_text))
            skipped += 1
            continue

        called += 1
        logger.info("Calling OpenAI (page %s, %s chars)", page_no, len(page_text))

        parsed = call_openai_structured(
            schema=schema_cls,
            user_text=f"PAGE {page_no}\n\n{page_text}",
            system_prompt=DEFAULT_SYSTEM_PROMPT + "\n\nExtrahiere nur Unterkünfte, die auf DIESER Seite stehen. Leere Liste ist erlaubt.",
            model=args.model,
        )

        parsed_dict = _to_jsonable(parsed)
        entries = _as_list(parsed_dict, "unterkuenfte")
        logger.info("Page %s: extracted %s unterkuenfte", page_no, len(entries))
        merged.extend(entries)

    merged = _dedupe_entries(merged)
    logger.info("Calls made: %s | pages skipped: %s | merged unique unterkuenfte: %s", called, skipped, len(merged))

    # Write a single merged object matching the schema (no extra fields).
    final_obj = schema_cls.model_validate({"unterkuenfte": merged}) if hasattr(schema_cls, "model_validate") else schema_cls.parse_obj({"unterkuenfte": merged})  # type: ignore[attr-defined]
    result = _to_jsonable(final_obj)

    out_path = Path(args.out)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Wrote %s (unterkuenfte=%s)", out_path, len(merged))


if __name__ == "__main__":
    main()


