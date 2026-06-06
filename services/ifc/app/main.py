"""
ByggKalkyl – IFC/PDF-mikrotjänst (FastAPI).

Ansvar:
  * /ifc/quantities  – mängduttag ur IFC via ifcopenshell (Steg 2a).
  * /pdf/render      – rasterisera ritningssidor + extrahera text via PyMuPDF (Steg 2b).

Tunga bibliotek (ifcopenshell, pymupdf) importeras lazy i respektive endpoint så att
tjänsten startar även om ett bibliotek saknas i miljön. Steg 0 levererar /health.
"""
from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="ByggKalkyl IFC/PDF-tjänst",
    version="0.1.0",
    description="Mängduttag ur IFC och rasterisering av PDF-ritningar.",
)

# Webben (Next.js) anropar denna tjänst server-till-server. CORS öppet i MVP.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    capabilities: dict[str, bool]


def _has_module(name: str) -> bool:
    """Kolla om ett (tungt) bibliotek finns installerat utan att importera det helt."""
    import importlib.util

    return importlib.util.find_spec(name) is not None


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="byggkalkyl-ifc",
        version="0.1.0",
        capabilities={
            "ifc": _has_module("ifcopenshell"),
            "pdf": _has_module("fitz") or _has_module("pymupdf"),
        },
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "byggkalkyl-ifc", "docs": "/docs", "health": "/health"}


# Maxgräns för PDF-rasterisering (skydd mot enorma underlag). Sätts via env i moln.
PDF_MAX_PAGES = int(os.getenv("PDF_MAX_PAGES", "30"))


def _save_temp(data: bytes, suffix: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        return tmp.name


@app.post("/ifc/quantities")
async def ifc_quantities(file: UploadFile = File(...)) -> dict:
    """Mängduttag ur en uppladdad IFC-fil."""
    from .ifc_parse import parse_ifc_quantities

    data = await file.read()
    path = _save_temp(data, ".ifc")
    try:
        return parse_ifc_quantities(path)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Kunde inte läsa IFC: {exc}")
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


@app.post("/pdf/render")
async def pdf_render(file: UploadFile = File(...)) -> dict:
    """Rasterisera en uppladdad PDF till PNG-sidor + text."""
    from .pdf_render import render_pdf

    data = await file.read()
    path = _save_temp(data, ".pdf")
    try:
        return render_pdf(path, max_pages=PDF_MAX_PAGES)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Kunde inte läsa PDF: {exc}")
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
