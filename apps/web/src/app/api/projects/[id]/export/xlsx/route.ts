import { NextRequest, NextResponse } from "next/server";

import { loadExportData, safeFilename } from "@/lib/export/load";
import { buildCalculationXlsx } from "@/lib/export/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exportera senaste (eller ?resultId=) kalkyl till Excel. */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const resultId = req.nextUrl.searchParams.get("resultId") ?? undefined;
  const data = await loadExportData(params.id, resultId);
  if (!data) {
    return NextResponse.json(
      { error: "Ingen kalkyl att exportera. Beräkna kalkylen först." },
      { status: 404 },
    );
  }
  const buffer = await buildCalculationXlsx(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kalkyl-${safeFilename(data.projektNamn)}.xlsx"`,
    },
  });
}
