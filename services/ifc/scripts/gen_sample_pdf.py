"""Skapa en enkel exempel-ritning som PDF (för att testa PDF/vision-mängdning)."""
from __future__ import annotations

import os

import fitz  # PyMuPDF

OUT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "samples", "exempel-ritning.pdf")
)


def main() -> None:
    doc = fitz.open()
    page = doc.new_page(width=842, height=595)  # ~A4 liggande

    # Enkel rumsruta
    page.draw_rect(fitz.Rect(50, 50, 500, 350), color=(0, 0, 0), width=1.2)

    lines = [
        "RUM 101 - Kontor (EXEMPELRITNING)",
        "Innervagg gips 13mm dubbel: ca 24 m2",
        "Undertak gips: 18 m2",
        "Golv parkett: 16 m2",
        "Vagguttag jordat: 4 st",
        "Strombrytare: 2 st",
        "Innerdorr: 1 st",
        "Fonster: 2 st",
    ]
    y = 80
    for i, line in enumerate(lines):
        size = 15 if i == 0 else 11
        page.insert_text((65, y), line, fontsize=size)
        y += 28 if i == 0 else 22

    doc.save(OUT)
    doc.close()
    print(f"Skrev {OUT}")


if __name__ == "__main__":
    main()
