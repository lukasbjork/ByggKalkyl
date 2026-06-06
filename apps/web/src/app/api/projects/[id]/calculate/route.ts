import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { applyDiscount, findDiscountPercent } from "@/lib/price";
import {
  computeCalculation,
  DEFAULT_SETTINGS,
  type CalcInputItem,
  type CalcSettings,
} from "@/lib/calc/engine";

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

  const [settingsRow, rules, takeoffItems] = await Promise.all([
    prisma.calculationSettings.findUnique({ where: { projectId: params.id } }),
    prisma.discountRule.findMany(),
    prisma.takeoffItem.findMany({
      where: { projectId: params.id, granskad: true },
      include: { kopplatResource: true, kopplatTimeNorm: { include: { trade: true } } },
    }),
  ]);

  if (takeoffItems.length === 0) {
    return NextResponse.json(
      { error: "Inga granskade poster att beräkna. Markera poster som granskade först." },
      { status: 400 },
    );
  }

  const settings: CalcSettings = settingsRow
    ? {
        omkostnadProcent: Number(settingsRow.omkostnadProcent),
        materialPaslagProcent: Number(settingsRow.materialPaslagProcent),
        riskProcent: Number(settingsRow.riskProcent),
        arbetsdagTimmar: Number(settingsRow.arbetsdagTimmar),
      }
    : DEFAULT_SETTINGS;

  const inputs: CalcInputItem[] = takeoffItems.map((t) => {
    let nettoApris: number | null = null;
    let leverantor: string | null = null;
    if (t.kopplatResource) {
      const brutto = Number(t.kopplatResource.bruttopris);
      const rabatt = findDiscountPercent(
        t.kopplatResource.leverantor,
        t.kopplatResource.varugrupp,
        rules,
      );
      nettoApris = applyDiscount(brutto, rabatt);
      leverantor = t.kopplatResource.leverantor;
    }
    let timmarPerEnhet: number | null = null;
    let yrke: string | null = null;
    let timpris: number | null = null;
    if (t.kopplatTimeNorm) {
      timmarPerEnhet = Number(t.kopplatTimeNorm.timmarPerEnhet);
      yrke = t.kopplatTimeNorm.trade.namn;
      timpris = Number(t.kopplatTimeNorm.trade.timpris);
    }
    return {
      id: t.id,
      benamning: t.benamning,
      kod: t.kod,
      byggdel: t.kod ?? t.benamning,
      mangd: Number(t.mangd),
      enhet: t.enhet,
      granskad: t.granskad,
      nettoApris,
      leverantor,
      timmarPerEnhet,
      yrke,
      timpris,
    };
  });

  const calc = computeCalculation(inputs, settings);

  const result = await prisma.calculationResult.create({
    data: {
      projectId: params.id,
      prisProvider: "INTERNAL",
      prislage: `Intern prislista ${new Date().toISOString().slice(0, 10)}`,
      totalMaterial: calc.totalMaterial,
      totalArbete: calc.totalArbete,
      totalOmkostnad: calc.totalOmkostnad,
      totalRisk: calc.totalRisk,
      grandTotal: calc.grandTotal,
      totalArbetstimmar: calc.totalArbetstimmar,
      arbetsdagTimmar: calc.arbetsdagTimmar,
      tidPerYrke: calc.tidPerYrke as unknown as Prisma.InputJsonValue,
      linjer: {
        create: calc.lines.map((l) => ({
          takeoffItemId: l.takeoffItemId,
          kod: l.kod,
          benamning: l.benamning,
          byggdel: l.byggdel,
          mangd: l.mangd,
          enhet: l.enhet as never,
          leverantor: l.leverantor,
          nettoApris: l.nettoApris,
          materialkostnad: l.materialkostnad,
          yrke: l.yrke,
          timmarPerEnhet: l.timmarPerEnhet,
          arbetstimmar: l.arbetstimmar,
          timpris: l.timpris,
          arbetskostnad: l.arbetskostnad,
          radtotal: l.radtotal,
          saknarPris: l.saknarPris,
          saknarTidsnorm: l.saknarTidsnorm,
        })),
      },
    },
  });

  await prisma.project.update({
    where: { id: params.id },
    data: { status: "CALCULATED" },
  });

  return NextResponse.json({ resultId: result.id, ...calc }, { status: 201 });
}
