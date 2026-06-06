import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { manualTakeoffSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista mängdposter för projektet. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const items = await prisma.takeoffItem.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

/** Skapa en manuell mängdpost (markeras granskad – användaren är källan). */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = manualTakeoffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig indata", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const item = await prisma.takeoffItem.create({
    data: {
      projectId: params.id,
      benamning: d.benamning,
      kod: d.kod ?? null,
      mangd: new Prisma.Decimal(d.mangd),
      enhet: d.enhet,
      lageskod: d.lageskod ?? null,
      kalla: "MANUAL",
      konfidens: null,
      granskad: true,
    },
  });

  await prisma.project.updateMany({
    where: { id: params.id, status: "DRAFT" },
    data: { status: "TAKEOFF" },
  });

  return NextResponse.json(item, { status: 201 });
}
