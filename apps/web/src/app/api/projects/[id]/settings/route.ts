import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { settingsSchema } from "@/lib/schemas";
import { DEFAULT_SETTINGS } from "@/lib/calc/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hämta kalkylinställningar (defaults om inga sparade). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const s = await prisma.calculationSettings.findUnique({
    where: { projectId: params.id },
  });
  if (!s) {
    return NextResponse.json({ projectId: params.id, ...DEFAULT_SETTINGS });
  }
  return NextResponse.json({
    projectId: s.projectId,
    omkostnadProcent: Number(s.omkostnadProcent),
    materialPaslagProcent: Number(s.materialPaslagProcent),
    riskProcent: Number(s.riskProcent),
    arbetsdagTimmar: Number(s.arbetsdagTimmar),
  });
}

/** Spara/uppdatera kalkylinställningar. */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig indata", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const data = {
    omkostnadProcent: new Prisma.Decimal(d.omkostnadProcent),
    materialPaslagProcent: new Prisma.Decimal(d.materialPaslagProcent),
    riskProcent: new Prisma.Decimal(d.riskProcent),
    arbetsdagTimmar: new Prisma.Decimal(d.arbetsdagTimmar),
  };
  const s = await prisma.calculationSettings.upsert({
    where: { projectId: params.id },
    update: data,
    create: { projectId: params.id, ...data },
  });
  return NextResponse.json({ ok: true, id: s.id });
}
