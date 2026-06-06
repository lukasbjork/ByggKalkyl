"""Mängduttag ur IFC med ifcopenshell.

Strategi (ärlig, automatisk):
  1. Läs lagrade basmängder (Qto_*BaseQuantities) – snabbt och exakt när de finns.
  2. Saknas mängder beräknas area/volym/längd ur GEOMETRIN (ifcopenshell.geom),
     så att även modeller utan Qto ger m²/m³/m automatiskt (ingen AI behövs).
  3. Saknas även geometri används antal (st).

Resultatet är auktoritativt (källa IFC, konfidens 1) men användaren granskar ändå.
Geometriberäkning hoppas över för mycket stora modeller (skydd mot timeout) – styrs
via GEOM_MAX_ELEMENTS.
"""
from __future__ import annotations

import os

import ifcopenshell
import ifcopenshell.util.element as ifc_element

try:
    import ifcopenshell.geom as ifc_geom
    import ifcopenshell.util.unit as ifc_unit

    _GEOM_AVAILABLE = True
except Exception:  # pragma: no cover
    _GEOM_AVAILABLE = False

GEOM_MAX_ELEMENTS = int(os.getenv("GEOM_MAX_ELEMENTS", "1500"))

TYPE_LABELS: dict[str, str] = {
    "IfcWall": "Vägg",
    "IfcSlab": "Bjälklag/golv",
    "IfcRoof": "Tak",
    "IfcCovering": "Beklädnad/ytskikt",
    "IfcWindow": "Fönster",
    "IfcDoor": "Dörr",
    "IfcColumn": "Pelare",
    "IfcBeam": "Balk",
    "IfcStair": "Trappa",
    "IfcRailing": "Räcke",
    "IfcPlate": "Skiva/plåt",
    "IfcMember": "Stomdel",
    "IfcFooting": "Grund",
    "IfcPile": "Påle",
    "IfcPipeSegment": "Rör",
    "IfcDuctSegment": "Kanal",
    "IfcCableSegment": "Kabel",
    "IfcCableCarrierSegment": "Kabelstege/ränna",
    "IfcSanitaryTerminal": "Sanitetsenhet",
    "IfcFurniture": "Inredning",
    "IfcFlowTerminal": "Don/terminal",
}

AREA_TYPES = {"IfcWall", "IfcSlab", "IfcRoof", "IfcCovering", "IfcPlate"}
LENGTH_TYPES = {
    "IfcBeam",
    "IfcColumn",
    "IfcMember",
    "IfcRailing",
    "IfcPipeSegment",
    "IfcDuctSegment",
    "IfcCableSegment",
    "IfcCableCarrierSegment",
}
COUNT_TYPES = {
    "IfcDoor",
    "IfcWindow",
    "IfcSanitaryTerminal",
    "IfcFurniture",
    "IfcStair",
    "IfcFlowTerminal",
}
SKIP_TYPES = {"IfcOpeningElement", "IfcVirtualElement"}


def _normalize_type(ifc_type: str) -> str:
    return ifc_type.replace("StandardCase", "")


def _best_quantity(qsets: dict, kind: str) -> float | None:
    net: float | None = None
    fallback: float | None = None
    for q in qsets.values():
        if not isinstance(q, dict):
            continue
        for key, val in q.items():
            if not isinstance(val, (int, float)) or val <= 0:
                continue
            kl = key.lower()
            if kind in kl:
                if "net" in kl and net is None:
                    net = float(val)
                if fallback is None:
                    fallback = float(val)
    return net if net is not None else fallback


def _geom_dims(geom, scale: float) -> dict | None:
    """area = produkt av två största bbox-mått (≈ footprint för bjälklag, ≈ sidoarea
    för väggar), längd = största måttet, volym ur meshen."""
    verts = geom.verts
    if not verts:
        return None
    xs = verts[0::3]
    ys = verts[1::3]
    zs = verts[2::3]
    d = sorted(
        [
            (max(xs) - min(xs)) * scale,
            (max(ys) - min(ys)) * scale,
            (max(zs) - min(zs)) * scale,
        ],
        reverse=True,
    )
    volume = 0.0
    try:
        import ifcopenshell.util.shape as ush

        volume = float(ush.get_volume(geom)) * (scale ** 3)
    except Exception:
        volume = 0.0
    return {"area": d[0] * d[1], "length": d[0], "volume": volume}


def _compute_geometry(model, elements: list, scale: float) -> dict:
    """Beräkna geometri-mängder för givna element via den parallella iteratorn
    (mycket snabbare än create_shape i en Python-loop). Nyckel: STEP-id."""
    out: dict[int, dict] = {}
    if not elements:
        return out
    settings = ifc_geom.settings()
    try:
        import multiprocessing

        threads = max(1, multiprocessing.cpu_count())
    except Exception:
        threads = 1
    try:
        it = ifc_geom.iterator(settings, model, threads, include=elements)
    except Exception:
        return out
    if not it.initialize():
        return out
    while True:
        shape = it.get()
        try:
            dims = _geom_dims(shape.geometry, scale)
            if dims:
                out[shape.id] = dims
        except Exception:
            pass
        if not it.next():
            break
    return out


def parse_ifc_quantities(path: str) -> dict:
    model = ifcopenshell.open(path)
    schema = getattr(model, "schema", "okänt")

    elements = [e for e in model.by_type("IfcElement") if e.is_a() not in SKIP_TYPES]

    use_geom = _GEOM_AVAILABLE and 0 < len(elements) <= GEOM_MAX_ELEMENTS
    try:
        scale = ifc_unit.calculate_unit_scale(model) if use_geom else 1.0
    except Exception:
        scale = 1.0

    # Pass 1: läs Qto per element och samla element som saknar mängder.
    qto: dict[int, tuple] = {}
    need_geom: list = []
    for el in elements:
        norm = _normalize_type(el.is_a())
        try:
            qsets = ifc_element.get_psets(el, qtos_only=True)
        except Exception:
            qsets = {}
        a = _best_quantity(qsets, "area")
        v = _best_quantity(qsets, "volume")
        ln = _best_quantity(qsets, "length")
        qto[el.id()] = (a, v, ln)
        if use_geom and norm not in COUNT_TYPES and not (a or v or ln):
            need_geom.append(el)

    geom_by_id = _compute_geometry(model, need_geom, scale) if need_geom else {}
    geom_used = bool(geom_by_id)

    # Pass 2: aggregera per typ (med geometri-fallback).
    agg: dict[str, dict[str, float | bool]] = {}
    for el in elements:
        norm = _normalize_type(el.is_a())
        bucket = agg.setdefault(
            norm, {"count": 0.0, "area": 0.0, "volume": 0.0, "length": 0.0, "geom": False}
        )
        bucket["count"] += 1

        area, volume, length = qto[el.id()]
        if not (area or volume or length):
            g = geom_by_id.get(el.id())
            if g:
                if norm in AREA_TYPES:
                    area = g["area"]
                if norm in LENGTH_TYPES:
                    length = g["length"]
                volume = g["volume"]
                bucket["geom"] = True

        if area:
            bucket["area"] += area
        if volume:
            bucket["volume"] += volume
        if length:
            bucket["length"] += length

    items: list[dict] = []
    for norm, b in sorted(agg.items()):
        label = TYPE_LABELS.get(norm, norm)
        count = int(b["count"])

        if norm in COUNT_TYPES:
            mangd, enhet = float(count), "st"
        elif norm in AREA_TYPES and b["area"] > 0:
            mangd, enhet = round(b["area"], 3), "m2"
        elif norm in LENGTH_TYPES and b["length"] > 0:
            mangd, enhet = round(b["length"], 3), "m"
        elif b["area"] > 0:
            mangd, enhet = round(b["area"], 3), "m2"
        elif b["length"] > 0:
            mangd, enhet = round(b["length"], 3), "m"
        elif b["volume"] > 0:
            mangd, enhet = round(b["volume"], 3), "m3"
        else:
            mangd, enhet = float(count), "st"

        extra = [f"antal {count} st"]
        if b["area"] > 0:
            extra.append(f"area {round(b['area'], 2)} m²")
        if b["volume"] > 0:
            extra.append(f"volym {round(b['volume'], 2)} m³")
        if b["length"] > 0:
            extra.append(f"längd {round(b['length'], 2)} m")
        if b["geom"]:
            extra.append("geometriberäknad (modellen saknar Qto)")

        items.append(
            {
                "benamning": label,
                "kod": norm,
                "mangd": mangd,
                "enhet": enhet,
                "lage": None,
                "konfidens": 1.0,
                "antagande": "; ".join(extra),
            }
        )

    return {
        "schema": schema,
        "antal_typer": len(items),
        "geometriberaknad": geom_used,
        "items": items,
    }
