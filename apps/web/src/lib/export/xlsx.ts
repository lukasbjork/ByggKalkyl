import ExcelJS from "exceljs";

import type { ExportData } from "./types";

const KR = '#,##0.00 "kr"';

/** Bygg en offertvänlig Excel-fil från en kalkyl. */
export async function buildCalculationXlsx(data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ByggKalkyl";
  wb.created = new Date();

  const ws = wb.addWorksheet("Kalkyl");

  // Rubrik / metadata
  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = `Kalkyl – ${data.projektNamn}`;
  ws.getCell("A1").font = { size: 16, bold: true };
  ws.getCell("A2").value = data.kund ? `Kund: ${data.kund}` : "";
  ws.getCell("A3").value = `Datum: ${data.datum}`;
  ws.getCell("A4").value = `Prisläge: ${data.prislage ?? "–"} (källa: ${data.provider})`;
  ws.getCell("A5").value =
    "OBS: Priser/tidsnormer kan vara EXEMPELDATA. Belopp exkl. moms.";
  ws.getCell("A5").font = { italic: true, color: { argb: "FF888888" } };

  const headerRow = 7;
  const headers = [
    "Byggdel",
    "Benämning",
    "Kod",
    "Mängd",
    "Enhet",
    "Leverantör",
    "Netto-à",
    "Material",
    "Yrke",
    "Arbetstimmar",
    "Timpris",
    "Arbete",
    "Radtotal",
    "Anmärkning",
  ];
  ws.getRow(headerRow).values = headers;
  ws.getRow(headerRow).font = { bold: true };
  ws.getRow(headerRow).eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    c.border = { bottom: { style: "thin" } };
  });

  let r = headerRow + 1;
  for (const l of data.lines) {
    const anm = [
      l.saknarPris ? "SAKNAR PRIS" : "",
      l.saknarTidsnorm ? "SAKNAR TIDSNORM" : "",
    ]
      .filter(Boolean)
      .join(", ");
    const row = ws.getRow(r);
    row.values = [
      l.byggdel ?? "",
      l.benamning,
      l.kod ?? "",
      l.mangd,
      l.enhet,
      l.leverantor ?? "",
      l.nettoApris ?? null,
      l.materialkostnad,
      l.yrke ?? "",
      l.arbetstimmar,
      l.timpris ?? null,
      l.arbetskostnad,
      l.radtotal,
      anm,
    ];
    for (const col of [7, 8, 11, 12, 13]) row.getCell(col).numFmt = KR;
    if (anm) row.getCell(14).font = { color: { argb: "FFB45309" }, bold: true };
    r++;
  }

  // Summering
  r += 1;
  const sum = (label: string, value: number, bold = false) => {
    ws.getCell(`L${r}`).value = label;
    ws.getCell(`L${r}`).font = { bold };
    ws.getCell(`M${r}`).value = value;
    ws.getCell(`M${r}`).numFmt = KR;
    ws.getCell(`M${r}`).font = { bold };
    r++;
  };
  sum("Material", data.totals.totalMaterial);
  sum("Arbete", data.totals.totalArbete);
  sum("Omkostnad/påslag", data.totals.totalOmkostnad);
  sum("Risk", data.totals.totalRisk);
  sum("Total (exkl. moms)", data.totals.grandTotal, true);

  ws.getCell(`L${r}`).value = "Total arbetstid";
  ws.getCell(`M${r}`).value = `${data.totals.totalArbetstimmar} h (${data.totals.totalDagar} dagar)`;
  r++;

  // Kolumnbredder
  const widths = [16, 28, 10, 10, 8, 16, 12, 14, 14, 14, 12, 14, 14, 20];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  // Blad 2: tid per yrke
  const ws2 = wb.addWorksheet("Tid per yrke");
  ws2.getRow(1).values = ["Yrke", "Timmar", "Dagar", "Arbetskostnad"];
  ws2.getRow(1).font = { bold: true };
  let rr = 2;
  for (const t of data.tidPerYrke) {
    ws2.getRow(rr).values = [
      t.yrke,
      t.timmar,
      data.totals.arbetsdagTimmar ? Math.round((t.timmar / data.totals.arbetsdagTimmar) * 100) / 100 : 0,
      t.kostnad,
    ];
    ws2.getRow(rr).getCell(4).numFmt = KR;
    rr++;
  }
  [18, 12, 10, 16].forEach((w, i) => (ws2.getColumn(i + 1).width = w));

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
