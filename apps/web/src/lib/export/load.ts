import { prisma } from "../db";
import type { ExportData } from "./types";

/** Ladda data för export från en (senaste eller specifik) CalculationResult. */
export async function loadExportData(
  projectId: string,
  resultId?: string,
): Promise<ExportData | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const result = resultId
    ? await prisma.calculationResult.findUnique({
        where: { id: resultId },
        include: { linjer: true },
      })
    : await prisma.calculationResult.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: { linjer: true },
      });

  if (!result || result.projectId !== projectId) return null;

  const arbetsdag = Number(result.arbetsdagTimmar);
  const totalTim = Number(result.totalArbetstimmar);

  return {
    projektNamn: project.namn,
    kund: project.kund,
    datum: result.createdAt.toISOString().slice(0, 10),
    prislage: result.prislage,
    provider: result.prisProvider,
    lines: result.linjer.map((l) => ({
      byggdel: l.byggdel,
      benamning: l.benamning,
      kod: l.kod,
      mangd: Number(l.mangd),
      enhet: l.enhet,
      leverantor: l.leverantor,
      nettoApris: l.nettoApris != null ? Number(l.nettoApris) : null,
      materialkostnad: Number(l.materialkostnad),
      yrke: l.yrke,
      arbetstimmar: Number(l.arbetstimmar),
      timpris: l.timpris != null ? Number(l.timpris) : null,
      arbetskostnad: Number(l.arbetskostnad),
      radtotal: Number(l.radtotal),
      saknarPris: l.saknarPris,
      saknarTidsnorm: l.saknarTidsnorm,
    })),
    totals: {
      totalMaterial: Number(result.totalMaterial),
      totalArbete: Number(result.totalArbete),
      totalOmkostnad: Number(result.totalOmkostnad),
      totalRisk: Number(result.totalRisk),
      grandTotal: Number(result.grandTotal),
      totalArbetstimmar: totalTim,
      totalDagar: arbetsdag > 0 ? Math.round((totalTim / arbetsdag) * 100) / 100 : 0,
      arbetsdagTimmar: arbetsdag,
    },
    tidPerYrke: (result.tidPerYrke as ExportData["tidPerYrke"]) ?? [],
  };
}

/** Säkert filnamn av projektnamn. */
export function safeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, "_").slice(0, 60) || "kalkyl";
}
