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


def _bbox_dims(geom) -> tuple[float, float, float] | None:
    verts = geom.verts
    if not verts:
        return None
    xs = verts[0::3]
    ys = verts[1::3]
    zs = verts[2::3]
    return (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))


def _geom_quantities(el, settings, scale: float) -> dict | None:
    """Beräkna area/volym/längd ur geometrin. Area = produkten av de två största
    bbox-måtten (≈ footprint för bjälklag, ≈ sidoarea för väggar)."""
    try:
        shape = ifc_geom.create_shape(settings, el)
        geom = shape.geometry
    except Exception:
        return None
    dims = _bbox_dims(geom)
    if not dims:
        return None
    d = sorted((v * scale for v in dims), reverse=True)
    area = d[0] * d[1]
    length = d[0]
    volume = 0.0
    try:
        import ifcopenshell.util.shape as ush

        volume = float(ush.get_volume(geom)) * (scale ** 3)
    except Exception:
        volume = 0.0
    return {"area": area, "length": length, "volume": volume}


def parse_ifc_quantities(path: str) -> dict:
    model = ifcopenshell.open(path)
    schema = getattr(model, "schema", "okänt")

    elements = [e for e in model.by_type("IfcElement") if e.is_a() not in SKIP_TYPES]

    use_geom = _GEOM_AVAILABLE and 0 < len(elements) <= GEOM_MAX_ELEMENTS
    settings = ifc_geom.settings() if use_geom else None
    try:
        scale = ifc_unit.calculate_unit_scale(model) if use_geom else 1.0
    except Exception:
        scale = 1.0

    geom_used = False
    agg: dict[str, dict[str, float | bool]] = {}

    for el in elements:
        norm = _normalize_type(el.is_a())
        bucket = agg.setdefault(
            norm, {"count": 0.0, "area": 0.0, "volume": 0.0, "length": 0.0, "geom": False}
        )
        bucket["count"] += 1

        try:
            qsets = ifc_element.get_psets(el, qtos_only=True)
        except Exception:
            qsets = {}

        area = _best_quantity(qsets, "area")
        volume = _best_quantity(qsets, "volume")
        length = _best_quantity(qsets, "length")

        # Geometri-fallback om Qto saknas (ej för rena antals-typer).
        if use_geom and norm not in COUNT_TYPES and not (area or volume or length):
            g = _geom_quantities(el, settings, scale)
            if g:
                if norm in AREA_TYPES:
                    area = g["area"]
                if norm in LENGTH_TYPES:
                    length = g["length"]
                volume = g["volume"]
                bucket["geom"] = True
                geom_used = True

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
