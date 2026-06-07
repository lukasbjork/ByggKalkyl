import { Prisma } from "@prisma/client";

import { prisma } from "../db";
import { toUnit } from "../takeoff";

export interface EdiImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** Enkel CSV-parser (hanterar citattecken och kommatecken i fält). */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/**
 * EDI/e-katalog-import: läser en leverantörs CSV och uppdaterar Resource.
 * Förväntade kolumner (rubrikrad): leverantor, artikelnr, benamning, enhet, bruttopris, varugrupp.
 * varugrupp är valfri.
 */
export class EdiCatalogProvider {
  readonly name = "EDI";

  async importCsv(content: string): Promise<EdiImportResult> {
    const rows = parseCsv(content);
    const result: EdiImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
    if (rows.length < 2) {
      result.errors.push("CSV saknar datarader.");
      return result;
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = {
      leverantor: header.indexOf("leverantor"),
      artikelnr: header.indexOf("artikelnr"),
      gtin: header.indexOf("gtin"),
      benamning: header.indexOf("benamning"),
      enhet: header.indexOf("enhet"),
      bruttopris: header.indexOf("bruttopris"),
      varugrupp: header.indexOf("varugrupp"),
    };

    if (idx.benamning === -1 || idx.bruttopris === -1 || idx.leverantor === -1) {
      result.errors.push(
        "CSV måste ha kolumnerna: leverantor, artikelnr, benamning, enhet, bruttopris, varugrupp.",
      );
      return result;
    }

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : "");

      const leverantor = get(idx.leverantor);
      const benamning = get(idx.benamning);
      const bruttoRaw = get(idx.bruttopris).replace(",", ".");
      const brutto = parseFloat(bruttoRaw);
      if (!leverantor || !benamning || Number.isNaN(brutto)) {
        result.skipped++;
        continue;
      }
      const artikelnr = get(idx.artikelnr) || null;
      const gtin = get(idx.gtin) || null;
      const enhet = toUnit(get(idx.enhet) || "st") ?? "st";
      const varugrupp = get(idx.varugrupp) || null;

      // Uppsert per (leverantor, artikelnr). Saknas artikelnr matchas på benämning.
      const existing = await prisma.resource.findFirst({
        where: artikelnr
          ? { leverantor, artikelnr }
          : { leverantor, benamning },
      });

      if (existing) {
        await prisma.resource.update({
          where: { id: existing.id },
          data: {
            benamning,
            gtin,
            enhet,
            bruttopris: new Prisma.Decimal(brutto),
            varugrupp,
            prisProvider: "EDI",
          },
        });
        result.updated++;
      } else {
        await prisma.resource.create({
          data: {
            leverantor,
            artikelnr,
            gtin,
            benamning,
            enhet,
            bruttopris: new Prisma.Decimal(brutto),
            varugrupp,
            prisProvider: "EDI",
          },
        });
        result.imported++;
      }
    }

    return result;
  }
}
