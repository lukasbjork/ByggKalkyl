"""Rasterisera PDF-ritningar till PNG + extrahera text med PyMuPDF (fitz)."""
from __future__ import annotations

import base64

import fitz  # PyMuPDF


def render_pdf(path: str, max_pages: int = 30, dpi: int = 144) -> dict:
    doc = fitz.open(path)
    total = doc.page_count
    pages: list[dict] = []

    for i in range(min(total, max_pages)):
        page = doc.load_page(i)
        pix = page.get_pixmap(dpi=dpi)
        png = pix.tobytes("png")
        pages.append(
            {
                "page": i + 1,
                "width": pix.width,
                "height": pix.height,
                "image_base64": base64.b64encode(png).decode("ascii"),
                "text": page.get_text("text"),
            }
        )

    doc.close()
    return {
        "total_pages": total,
        "rendered_pages": len(pages),
        "truncated": total > max_pages,
        "pages": pages,
    }
