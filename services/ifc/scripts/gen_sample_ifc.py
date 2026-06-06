"""Generera en minimal men giltig exempel-IFC med basmängder (Qto).

Körs en gång för att skapa samples/minimal.ifc:
    .venv\\Scripts\\python.exe scripts/gen_sample_ifc.py
"""
from __future__ import annotations

import os

import ifcopenshell
from ifcopenshell.api import run

OUT = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "samples", "minimal.ifc"
)


def make(model, ifc_class: str, name: str, qto_name: str, props: dict):
    el = run("root.create_entity", model, ifc_class=ifc_class, name=name)
    qto = run("pset.add_qto", model, product=el, name=qto_name)
    run("pset.edit_qto", model, qto=qto, properties=props)
    return el


def main() -> None:
    model = ifcopenshell.file(schema="IFC4")
    run("root.create_entity", model, ifc_class="IfcProject", name="ByggKalkyl Exempel")

    # 3 väggar med basmängder
    for i in range(3):
        make(
            model,
            "IfcWall",
            f"Innervägg {i + 1}",
            "Qto_WallBaseQuantities",
            {"NetSideArea": 12.5, "NetVolume": 1.6, "Length": 5.0, "Height": 2.5},
        )

    # 1 bjälklag
    make(
        model,
        "IfcSlab",
        "Golvbjälklag",
        "Qto_SlabBaseQuantities",
        {"NetArea": 45.0, "NetVolume": 9.0},
    )

    # 2 dörrar (antal/area)
    for i in range(2):
        make(
            model,
            "IfcDoor",
            f"Dörr {i + 1}",
            "Qto_DoorBaseQuantities",
            {"Area": 1.8},
        )

    # 4 fönster
    for i in range(4):
        make(
            model,
            "IfcWindow",
            f"Fönster {i + 1}",
            "Qto_WindowBaseQuantities",
            {"Area": 1.2},
        )

    out = os.path.normpath(OUT)
    model.write(out)
    print(f"Skrev {out}")


if __name__ == "__main__":
    main()
