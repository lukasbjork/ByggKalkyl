import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ladda ner originalfilen för ett dokument. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const doc = await prisma.projectDocument.findUnique({ where: { id: params.id } });
  if (!doc) {
    return NextResponse.json({ error: "Dokumentet hittades inte" }, { status: 404 });
  }
  const storage = getStorage();
  if (!(await storage.exists(doc.lagringssokvag))) {
    return NextResponse.json({ error: "Filen saknas i lagringen" }, { status: 404 });
  }
  const data = await storage.read(doc.lagringssokvag);
  // Konvertera Node-Buffer till Uint8Array (BodyInit accepterar inte Buffer-typen).
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.filnamn)}"`,
    },
  });
}

/** Ta bort ett enskilt dokument (fil + DB-rad). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const doc = await prisma.projectDocument.findUnique({ where: { id: params.id } });
  if (!doc) {
    return NextResponse.json({ error: "Dokumentet hittades inte" }, { status: 404 });
  }
  const storage = getStorage();
  await storage.delete(doc.lagringssokvag).catch(() => {});
  await prisma.projectDocument.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
