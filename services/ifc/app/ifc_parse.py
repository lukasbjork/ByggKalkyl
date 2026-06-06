"""Mängduttag ur IFC med ifcopenshell.

Strategi (MVP, ärlig): läs lagrade basmängder (Qto_*BaseQuantities) per element och
aggregera per Ifc-typ. Saknas mängder används antal (st). Resultatet är auktoritativt
(källa IFC, konfidens 1) men användaren granskar ändå.
"""
from __future__ import annotations

import ifcopenshell
import ifcopenshell.util.element as ifc_element

# Ifc-typ → svensk benämning.
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
    """Slå ihop varianter, t.ex. IfcWallStandardCase → IfcWall."""
    return ifc_type.replace("StandardCase", "")


def _best_quantity(qsets: dict, kind: str) -> float | None:
    """Hitta bästa numeriska mängd av given sort ('area'|'volume'|'length').
    Föredrar nycklar som innehåller 'net'."""
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


def parse_ifc_quantities(path: str) -> dict:
    model = ifcopenshell.open(path)

    schema = getattr(model, "schema", "okänt")

    # Aggregat per normaliserad typ.
    agg: dict[str, dict[str, float]] = {}

    for el in model.by_type("IfcElement"):
        ifc_type = el.is_a()
        if ifc_type in SKIP_TYPES:
            continue
        norm = _normalize_type(ifc_type)
        bucket = agg.setdefault(
            norm, {"count": 0.0, "area": 0.0, "volume": 0.0, "length": 0.0}
        )
        bucket["count"] += 1

        try:
            qsets = ifc_element.get_psets(el, qtos_only=True)
        except Exception:
            qsets = {}

        area = _best_quantity(qsets, "area")
        volume = _best_quantity(qsets, "volume")
        length = _best_quantity(qsets, "length")
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

        # Välj representativ enhet/mängd.
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

        # Notering med övriga mängder för spårbarhet.
        extra = [f"antal {count} st"]
        if b["area"] > 0:
            extra.append(f"area {round(b['area'], 2)} m²")
        if b["volume"] > 0:
            extra.append(f"volym {round(b['volume'], 2)} m³")
        if b["length"] > 0:
            extra.append(f"längd {round(b['length'], 2)} m")

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
        "items": items,
    }
