from __future__ import annotations

from pathlib import Path

import pdfplumber


def _extract_page_text(page: pdfplumber.page.Page) -> str:
    """
    pdfplumber can return sparse/None text depending on layout.
    We try a layout-aware extraction first; then fallback to word-based reconstruction.
    """
    try:
        txt = page.extract_text(layout=True, x_tolerance=2, y_tolerance=2) or ""
    except TypeError:
        # older pdfplumber versions may not support these kwargs
        txt = page.extract_text() or ""

    txt = txt.strip()
    if len(txt) >= 50:
        return txt

    # Fallback: reconstruct from words
    try:
        words = page.extract_words() or []
    except Exception:
        return txt

    if not words:
        return txt

    # Group by approximate line (y/top)
    lines: dict[int, list[dict]] = {}
    for w in words:
        top = int(round(w.get("top", 0)))
        lines.setdefault(top, []).append(w)

    out_lines: list[str] = []
    for top in sorted(lines.keys()):
        line_words = sorted(lines[top], key=lambda w: w.get("x0", 0))
        out_lines.append(" ".join(w.get("text", "").strip() for w in line_words if w.get("text")))
    return "\n".join(out_lines).strip()


def pdf_to_text(pdf_path: str | Path) -> str:
    path = Path(pdf_path)
    pages: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            pages.append(_extract_page_text(page))
    return "\n\n".join(pages).strip()


def pdf_to_pages_text(pdf_path: str | Path) -> list[str]:
    """
    Returns a list of per-page texts (1:1 with PDF pages).
    """
    path = Path(pdf_path)
    out: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            out.append(_extract_page_text(page))
    return out


def chunk_text(text: str, *, max_chars: int = 40_000, overlap_chars: int = 1_000) -> list[str]:
    """
    Simple char-based chunking with overlap to avoid cutting entries at boundaries.
    """
    text = text.strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + max_chars)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(0, end - overlap_chars)
    return chunks


