import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { runCalculation, NoReviewedItemsError } from "@/lib/calc/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kör kalkyl på granskade poster och spara en frusen CalculationResult. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }
  try {
    const result = await runCalculation(params.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof NoReviewedItemsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
