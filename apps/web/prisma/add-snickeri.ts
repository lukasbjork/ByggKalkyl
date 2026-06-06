/**
 * Lägger till snickeri-tidsnormer (EXEMPEL) för projekt av typ butiksinredning
 * (björkplywood, linoleum, portal, svängdörr). Kör med DATABASE_URL satt:
 *   pnpm -C apps/web exec tsx prisma/add-snickeri.ts
 *
 * EXEMPELDATA – ersätt med egna normtider.
 */
import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

const SNICKARE = "seed-trade-snickare";

const norms = [
  { id: "tn-sn-01", aktivitet: "Tillverka/montera plywoodfront", enhet: Unit.m2, timmarPerEnhet: 0.8, kod: "PLYWOOD" },
  { id: "tn-sn-02", aktivitet: "Montera hylla/skåp björkplywood", enhet: Unit.m2, timmarPerEnhet: 1.2, kod: "HYLLA" },
  { id: "tn-sn-03", aktivitet: "Montera portal", enhet: Unit.st, timmarPerEnhet: 4.0, kod: "PORTAL" },
  { id: "tn-sn-04", aktivitet: "Montera svängdörr", enhet: Unit.st, timmarPerEnhet: 3.0, kod: "SVANGDORR" },
  { id: "tn-sn-05", aktivitet: "Montera möbellinoleum", enhet: Unit.m2, timmarPerEnhet: 0.5, kod: "LINOLEUM" },
  { id: "tn-sn-06", aktivitet: "Flytta/återmontera befintlig inredning", enhet: Unit.st, timmarPerEnhet: 1.5, kod: "FLYTT" },
  { id: "tn-sn-07", aktivitet: "Ytbehandling/lackning", enhet: Unit.m2, timmarPerEnhet: 0.3, kod: "LACK" },
];

async function main() {
  const trade = await prisma.trade.findUnique({ where: { id: SNICKARE } });
  if (!trade) throw new Error("Snickare-trade saknas – kör pnpm seed först.");

  for (const n of norms) {
    await prisma.timeNorm.upsert({
      where: { id: n.id },
      update: { aktivitet: n.aktivitet, enhet: n.enhet, timmarPerEnhet: n.timmarPerEnhet, kod: n.kod, exempel: true },
      create: {
        id: n.id,
        aktivitet: n.aktivitet,
        enhet: n.enhet,
        timmarPerEnhet: n.timmarPerEnhet,
        kod: n.kod,
        tradeId: SNICKARE,
        exempel: true,
        notering: "EXEMPELDATA – snickeri (K207-test)",
      },
    });
  }
  console.log(`Lade till/uppdaterade ${norms.length} snickeri-tidsnormer.`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
