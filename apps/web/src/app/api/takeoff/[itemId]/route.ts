import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { patchTakeoffSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Uppdatera en mängdpost (redigera fält eller markera granskad). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { itemId: string } },
) {
  const body = await req.json().catch(() => null);
  const parsed = patchTakeoffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig indata", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const data: Prisma.TakeoffItemUpdateInput = {};
  if (d.benamning !== undefined) data.benamning = d.benamning;
  if (d.kod !== undefined) data.kod = d.kod ?? null;
  if (d.mangd !== undefined) data.mangd = new Prisma.Decimal(d.mangd);
  if (d.enhet !== undefined) data.enhet = d.enhet;
  if (d.lageskod !== undefined) data.lageskod = d.lageskod ?? null;
  if (d.granskad !== undefined) data.granskad = d.granskad;
  if (d.kopplatResourceId !== undefined)
    data.kopplatResource = d.kopplatResourceId
      ? { connect: { id: d.kopplatResourceId } }
      : { disconnect: true };
  if (d.kopplatTimeNormId !== undefined)
    data.kopplatTimeNorm = d.kopplatTimeNormId
      ? { connect: { id: d.kopplatTimeNormId } }
      : { disconnect: true };

  try {
    const item = await prisma.takeoffItem.update({
      where: { id: params.itemId },
      data,
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Posten hittades inte" }, { status: 404 });
  }
}

/** Ta bort en mängdpost. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { itemId: string } },
) {
  try {
    await prisma.takeoffItem.delete({ where: { id: params.itemId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Posten hittades inte" }, { status: 404 });
  }
}
