import { NextRequest, NextResponse } from "next/server";

import { EdiCatalogProvider } from "@/lib/price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Importera en leverantörs e-katalog (CSV) till prislistan (Resource). */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Förväntade multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ingen CSV-fil bifogad (fält 'file')" }, { status: 400 });
  }

  try {
    const content = await file.text();
    const edi = new EdiCatalogProvider();
    const result = await edi.importCsv(content);
    return NextResponse.json(result, { status: result.errors.length ? 400 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Importen misslyckades";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
