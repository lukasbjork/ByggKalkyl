import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { takeoffTextSchema } from "@/lib/schemas";
import { getLLMProvider, AINotConfiguredError } from "@/lib/ai";
import { createTakeoffItems } from "@/lib/takeoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tolka inklistrad rumslista/AMA-text till mängdförslag med AI. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = takeoffTextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Text krävs" }, { status: 400 });
  }

  const llm = getLLMProvider();
  if (!llm.available()) {
    return NextResponse.json(
      {
        error:
          "AI är inte konfigurerad. Lägg till en gratis GEMINI_API_KEY (aistudio.google.com/apikey) eller mata in poster manuellt.",
        code: "AI_NOT_CONFIGURED",
      },
      { status: 400 },
    );
  }

  try {
    const suggestion = await llm.takeoffFromText(parsed.data.text);
    const created = await createTakeoffItems(
      params.id,
      null,
      "AI_PDF",
      suggestion.items,
    );
    await prisma.project.updateMany({
      where: { id: params.id, status: "DRAFT" },
      data: { status: "TAKEOFF" },
    });
    return NextResponse.json(
      { created, osakerheter: suggestion.osakerheter },
      { status: 201 },
    );
  } catch (err) {
    const message =
      err instanceof AINotConfiguredError || err instanceof Error
        ? err.message
        : "AI-tolkningen misslyckades";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
