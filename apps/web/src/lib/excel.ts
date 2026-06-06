import ExcelJS from "exceljs";

import { toUnit } from "./takeoff";

export interface ParsedExcelRow {
  benamning: string;
  kod: string | null;
  mangd: number;
  enhet: string;
  lage: string | null;
}

/** Synonymer för kolumnrubriker (svenska, gemener). */
const COLS = {
  benamning: ["benämning", "benamning", "beskrivning", "post", "artikel", "namn"],
  mangd: ["mängd", "mangd", "antal", "kvantitet", "qty", "mängd "],
  enhet: ["enhet", "enh", "unit"],
  kod: ["kod", "bsab", "artikelnr", "art.nr", "kod/bsab"],
  lage: ["läge", "lage", "rum", "plats", "placering", "lägeskod"],
};

function matchColumn(header: string): keyof typeof COLS | null {
  const h = header.trim().toLowerCase();
  for (const key of Object.keys(COLS) as (keyof typeof COLS)[]) {
    if (COLS[key].some((syn) => h === syn || h.startsWith(syn))) return key;
  }
  return null;
}

/**
 * Läs första arbetsbladet och tolka kolumnerna benämning/mängd/enhet (+ kod/läge).
 * Kastar om ingen rad med kända rubriker hittas.
 */
export async function parseExcel(buffer: Buffer): Promise<ParsedExcelRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Excel-filen saknar arbetsblad.");

  // Hitta rubrikrad (första rad där minst benämning + mängd matchar).
  let headerRowIndex = -1;
  const colMap: Record<number, keyof typeof COLS> = {};

  for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
    const row = ws.getRow(r);
    const tentative: Record<number, keyof typeof COLS> = {};
    row.eachCell((cell, col) => {
      const val = cell.value;
      if (typeof val === "string") {
        const m = matchColumn(val);
        if (m) tentative[col] = m;
      }
    });
    const found = Object.values(tentative);
    if (found.includes("benamning") && found.includes("mangd")) {
      headerRowIndex = r;
      Object.assign(colMap, tentative);
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "Hittade inga kolumnrubriker (benämning/mängd/enhet). Kontrollera filen eller mata in manuellt.",
    );
  }

  const colByKey: Partial<Record<keyof typeof COLS, number>> = {};
  for (const [col, key] of Object.entries(colMap)) colByKey[key] = Number(col);

  const rows: ParsedExcelRow[] = [];
  for (let r = headerRowIndex + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cellStr = (key: keyof typeof COLS): string => {
      const col = colByKey[key];
      if (!col) return "";
      const v = row.getCell(col).value;
      return v == null ? "" : String(typeof v === "object" && "text" in v ? (v as { text: string }).text : v).trim();
    };
    const cellNum = (key: keyof typeof COLS): number => {
      const col = colByKey[key];
      if (!col) return NaN;
      const v = row.getCell(col).value;
      if (typeof v === "number") return v;
      const n = parseFloat(String(v ?? "").replace(",", "."));
      return n;
    };

    const benamning = cellStr("benamning");
    const mangd = cellNum("mangd");
    if (!benamning || Number.isNaN(mangd)) continue;

    const enhetRaw = cellStr("enhet") || "st";
    const enhet = toUnit(enhetRaw) ?? "st";

    rows.push({
      benamning,
      kod: cellStr("kod") || null,
      mangd,
      enhet,
      lage: cellStr("lage") || null,
    });
  }

  if (rows.length === 0) {
    throw new Error("Inga giltiga rader hittades under rubrikerna.");
  }
  return rows;
}
