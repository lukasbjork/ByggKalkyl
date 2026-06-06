import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hämta ett projekt med dokument. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      dokument: { orderBy: { createdAt: "desc" } },
      settings: true,
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }
  return NextResponse.json(project);
}

/** Ta bort ett projekt (och dess filer). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { dokument: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }
  // Radera lagrade filer (best effort) innan DB-raden tas bort.
  const storage = getStorage();
  await Promise.allSettled(
    project.dokument.map((d) => storage.delete(d.lagringssokvag)),
  );
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
