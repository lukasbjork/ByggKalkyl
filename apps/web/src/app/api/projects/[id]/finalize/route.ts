import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { autoMatchPrices, autoMatchTimeNorms } from "@/lib/match";
import { runCalculation, NoReviewedItemsError } from "@/lib/calc/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Ett-klick-finalisering: matcha priser + tidsnormer, auto-godkänn pålitliga
 * källor (IFC/Excel/manuellt), valfritt även AI-förslag, och kör kalkylen.
 * Gör INGA AI-anrop – snabbt och säkert inom serverless-tidsgränsen.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const includeAi = body?.includeAi === true;

  // 1) Auto-matcha priser och tidsnormer.
  const priser = await autoMatchPrices(params.id);
  const tider = await autoMatchTimeNorms(params.id);

  // 2) Auto-godkänn pålitliga källor (IFC/Excel/manuellt). AI kräver granskning
  //    om inte includeAi.
  const kallor = includeAi
    ? ["IFC", "EXCEL", "MANUAL", "AI_PDF"]
    : ["IFC", "EXCEL", "MANUAL"];
  const granskade = await prisma.takeoffItem.updateMany({
    where: { projectId: params.id, granskad: false, kalla: { in: kallor as never } },
    data: { granskad: true },
  });

  // 3) Hur många AI-förslag väntar fortfarande på granskning?
  const aiOgranskade = await prisma.takeoffItem.count({
    where: { projectId: params.id, granskad: false, kalla: "AI_PDF" },
  });

  // 4) Kör kalkyl (om det finns granskade poster).
  try {
    const calc = await runCalculation(params.id);
    return NextResponse.json({
      ...calc,
      priser,
      tider,
      autoGranskade: granskade.count,
      aiOgranskade,
    });
  } catch (err) {
    if (err instanceof NoReviewedItemsError) {
      return NextResponse.json(
        {
          needsReview: true,
          message:
            aiOgranskade > 0
              ? `${aiOgranskade} AI-förslag väntar på granskning. Granska dem (eller välj 'inkludera AI-förslag') och kör igen.`
              : "Inga granskade poster att beräkna.",
          priser,
          tider,
          autoGranskade: granskade.count,
          aiOgranskade,
        },
        { status: 200 },
      );
    }
    throw err;
  }
}
