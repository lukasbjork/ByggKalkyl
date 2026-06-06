# Exempelfiler (samples)

Testunderlag så att hela flödet kan köras utan externa API:er.

| Fil | Används i | Beskrivning |
|-----|-----------|-------------|
| `edi-katalog-exempel.csv` | Steg 3 (EDI-import) | Leverantörskatalog (leverantör, artikelnr, benämning, enhet, bruttopris, varugrupp). Importeras till `Resource` via `EdiCatalogProvider`. |
| `rumslista-exempel.txt` | Steg 2c | Stökig rumslista/AMA-text som Claude tolkar till mängdposter. |
| `minimal.ifc` | Steg 2a | Minimal IFC-modell med väggar/bjälklag + mängder. **Genereras i Steg 2** med ifcopenshell (`services/ifc`) för att garantera giltighet. |

> Alla värden är EXEMPELDATA – inte verkliga priser eller mängder.
