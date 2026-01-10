from __future__ import annotations

from pathlib import Path

import pdfplumber


def _extract_page_text(page: pdfplumber.page.Page) -> str:
    """
    pdfplumber can return sparse/None text depending on layout.
    We try a layout-aware extraction first; then fallback to word-based reconstruction.
    For multi-column pages, we reconstruct text column-wise (left then right) to avoid
    interleaving that hurts downstream extraction.
    """
    try:
        txt = page.extract_text(layout=True, x_tolerance=2, y_tolerance=2) or ""
    except TypeError:
        # older pdfplumber versions may not support these kwargs
        txt = page.extract_text() or ""

    txt = txt.strip()

    # Word-based reconstruction (more robust, and lets us fix column reading order)
    try:
        words = page.extract_words() or []
    except Exception:
        return txt

    if not words:
        return txt

    width = getattr(page, "width", None)
    mid_x = (float(width) / 2.0) if width else None

    def render_word_block(block_words: list[dict]) -> str:
        # Group by approximate line (y/top)
        lines: dict[int, list[dict]] = {}
        for w in block_words:
            top = int(round(float(w.get("top", 0))))
            lines.setdefault(top, []).append(w)

        out_lines: list[str] = []
        for top in sorted(lines.keys()):
            line_words = sorted(lines[top], key=lambda w: float(w.get("x0", 0)))
            out_lines.append(" ".join(w.get("text", "").strip() for w in line_words if w.get("text")))
        return "\n".join(out_lines).strip()

    # If we can detect words on both halves, render left column then right column.
    if mid_x is not None:
        left = [w for w in words if float(w.get("x0", 0)) < mid_x]
        right = [w for w in words if float(w.get("x0", 0)) >= mid_x]
        total = len(words) or 1
        if len(left) / total > 0.2 and len(right) / total > 0.2:
            left_txt = render_word_block(left)
            right_txt = render_word_block(right)
            combined = (left_txt + "\n\n" + right_txt).strip()
            if combined:
                return combined

    # Single column: render all words in reading order
    rendered = render_word_block(words)
    return rendered if rendered else txt


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


