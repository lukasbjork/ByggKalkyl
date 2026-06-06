/**
 * Seed-data för ByggKalkyl.
 *
 * VIKTIGT: Alla priser och tidsnormer här är EXEMPELDATA – inte verkliga värden.
 * Ersätt med egna inköpspriser/rabattbrev och egna normtider/historik.
 * Se README ("Byta exempeldata mot egna värden").
 *
 * Idempotent: använder upsert med fasta id:n så att seed kan köras om utan
 * att skapa dubbletter eller radera dina egna tillagda rader.
 */
import { PrismaClient, Unit, PriceProviderType } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Yrken (timpris i kr/h) ──────────────────────────────────────────────────
const trades = [
  { id: "seed-trade-snickare", namn: "Snickare", timpris: 500 },
  { id: "seed-trade-elektriker", namn: "Elektriker", timpris: 600 },
  { id: "seed-trade-murare", namn: "Murare", timpris: 520 },
  { id: "seed-trade-vvs", namn: "VVS-montör", timpris: 580 },
];

// ─── Material (EXEMPELDATA – ej verkliga priser) ─────────────────────────────
type SeedResource = {
  id: string;
  leverantor: string;
  artikelnr: string;
  benamning: string;
  enhet: Unit;
  bruttopris: number;
  varugrupp: string;
};

const resources: SeedResource[] = [
  // Beijer – skivor/virke/isolering/infästning
  { id: "seed-res-001", leverantor: "Beijer", artikelnr: "GN13-900", benamning: "Gipsskiva normal 13 mm 900x2500", enhet: Unit.st, bruttopris: 95, varugrupp: "Gips" },
  { id: "seed-res-002", leverantor: "Beijer", artikelnr: "GV13-900", benamning: "Gipsskiva våtrum 13 mm 900x2500", enhet: Unit.st, bruttopris: 145, varugrupp: "Gips" },
  { id: "seed-res-003", leverantor: "Beijer", artikelnr: "REG-4595", benamning: "Träregel 45x95 C24", enhet: Unit.m, bruttopris: 28, varugrupp: "Virke" },
  { id: "seed-res-004", leverantor: "Beijer", artikelnr: "REG-4545", benamning: "Träregel 45x45", enhet: Unit.m, bruttopris: 16, varugrupp: "Virke" },
  { id: "seed-res-005", leverantor: "Beijer", artikelnr: "REG-45145", benamning: "Konstruktionsvirke C24 45x145", enhet: Unit.m, bruttopris: 42, varugrupp: "Virke" },
  { id: "seed-res-006", leverantor: "Beijer", artikelnr: "PLY-12", benamning: "Plywood 12 mm", enhet: Unit.m2, bruttopris: 220, varugrupp: "Skivor" },
  { id: "seed-res-007", leverantor: "Beijer", artikelnr: "OSB-12", benamning: "OSB-skiva 12 mm", enhet: Unit.m2, bruttopris: 110, varugrupp: "Skivor" },
  { id: "seed-res-008", leverantor: "Beijer", artikelnr: "ISO-95", benamning: "Mineralull 95 mm", enhet: Unit.m2, bruttopris: 65, varugrupp: "Isolering" },
  { id: "seed-res-009", leverantor: "Beijer", artikelnr: "ISO-145", benamning: "Mineralull 145 mm", enhet: Unit.m2, bruttopris: 95, varugrupp: "Isolering" },
  { id: "seed-res-010", leverantor: "Beijer", artikelnr: "VIND-DUK", benamning: "Vindduk/diffusionsspärr", enhet: Unit.m2, bruttopris: 18, varugrupp: "Isolering" },
  { id: "seed-res-011", leverantor: "Beijer", artikelnr: "ANG-02", benamning: "Ångspärr plastfolie 0,2 mm", enhet: Unit.m2, bruttopris: 12, varugrupp: "Isolering" },
  { id: "seed-res-012", leverantor: "Beijer", artikelnr: "SKR-3525", benamning: "Gipsskruv 3,5x25 (förp 1000)", enhet: Unit.st, bruttopris: 89, varugrupp: "Infästning" },
  { id: "seed-res-013", leverantor: "Beijer", artikelnr: "SKR-4560", benamning: "Träskruv 4,5x60 (förp 200)", enhet: Unit.st, bruttopris: 119, varugrupp: "Infästning" },
  { id: "seed-res-014", leverantor: "Beijer", artikelnr: "SPIK-75", benamning: "Trådspik 75 mm", enhet: Unit.kg, bruttopris: 35, varugrupp: "Infästning" },

  // Ahlsell – VVS
  { id: "seed-res-015", leverantor: "Ahlsell", artikelnr: "PP-110", benamning: "Avloppsrör PP 110 mm", enhet: Unit.m, bruttopris: 145, varugrupp: "VVS-rör" },
  { id: "seed-res-016", leverantor: "Ahlsell", artikelnr: "PP-75", benamning: "Avloppsrör PP 75 mm", enhet: Unit.m, bruttopris: 98, varugrupp: "VVS-rör" },
  { id: "seed-res-017", leverantor: "Ahlsell", artikelnr: "PEX-15", benamning: "PEX-rör 15 mm", enhet: Unit.m, bruttopris: 22, varugrupp: "VVS-rör" },
  { id: "seed-res-018", leverantor: "Ahlsell", artikelnr: "GBR-150", benamning: "Golvbrunn 150 mm", enhet: Unit.st, bruttopris: 650, varugrupp: "VVS" },
  { id: "seed-res-019", leverantor: "Ahlsell", artikelnr: "BLA-TVS", benamning: "Blandare tvättställ", enhet: Unit.st, bruttopris: 1450, varugrupp: "VVS" },
  { id: "seed-res-020", leverantor: "Ahlsell", artikelnr: "WC-STD", benamning: "WC-stol golvstående", enhet: Unit.st, bruttopris: 2900, varugrupp: "VVS" },

  // Ahlsell – El
  { id: "seed-res-021", leverantor: "Ahlsell", artikelnr: "EKK-315", benamning: "Installationskabel EKK 3x1,5", enhet: Unit.m, bruttopris: 14, varugrupp: "El-kabel" },
  { id: "seed-res-022", leverantor: "Ahlsell", artikelnr: "EKK-325", benamning: "Installationskabel EKK 3x2,5", enhet: Unit.m, bruttopris: 21, varugrupp: "El-kabel" },
  { id: "seed-res-023", leverantor: "Ahlsell", artikelnr: "DOSA-INF", benamning: "Apparatdosa infälld", enhet: Unit.st, bruttopris: 18, varugrupp: "El-material" },
  { id: "seed-res-024", leverantor: "Ahlsell", artikelnr: "KDOSA", benamning: "Kopplingsdosa", enhet: Unit.st, bruttopris: 32, varugrupp: "El-material" },
  { id: "seed-res-025", leverantor: "Ahlsell", artikelnr: "STR-1P", benamning: "Strömbrytare enpolig", enhet: Unit.st, bruttopris: 89, varugrupp: "El-material" },
  { id: "seed-res-026", leverantor: "Ahlsell", artikelnr: "UTT-J", benamning: "Vägguttag jordat", enhet: Unit.st, bruttopris: 75, varugrupp: "El-material" },
  { id: "seed-res-027", leverantor: "Ahlsell", artikelnr: "CDOSA", benamning: "Centraldosa", enhet: Unit.st, bruttopris: 120, varugrupp: "El-material" },

  // Optimera – mur/betong
  { id: "seed-res-028", leverantor: "Optimera", artikelnr: "BTG-2530", benamning: "Betong C25/30 torrbruk 25 kg", enhet: Unit.st, bruttopris: 89, varugrupp: "Betong" },
  { id: "seed-res-029", leverantor: "Optimera", artikelnr: "MUR-B25", benamning: "Murbruk B 25 kg", enhet: Unit.st, bruttopris: 79, varugrupp: "Murbruk" },
  { id: "seed-res-030", leverantor: "Optimera", artikelnr: "LB-BLOCK", benamning: "Lättbetongblock", enhet: Unit.st, bruttopris: 38, varugrupp: "Mursten" },
  { id: "seed-res-031", leverantor: "Optimera", artikelnr: "ARM-NAT", benamning: "Armeringsnät", enhet: Unit.m2, bruttopris: 55, varugrupp: "Armering" },
];

// ─── Rabattbrev (EXEMPELDATA) ────────────────────────────────────────────────
const discountRules = [
  { id: "seed-dr-001", leverantor: "Ahlsell", varugrupp: "El-kabel", rabattProcent: 40 },
  { id: "seed-dr-002", leverantor: "Ahlsell", varugrupp: "VVS-rör", rabattProcent: 35 },
  { id: "seed-dr-003", leverantor: "Ahlsell", varugrupp: null as string | null, rabattProcent: 25 },
  { id: "seed-dr-004", leverantor: "Beijer", varugrupp: "Virke", rabattProcent: 30 },
  { id: "seed-dr-005", leverantor: "Beijer", varugrupp: null as string | null, rabattProcent: 20 },
  { id: "seed-dr-006", leverantor: "Optimera", varugrupp: null as string | null, rabattProcent: 22 },
];

// ─── Tidsnormer (EXEMPEL=true – ersätt med egna normtider/historik) ──────────
type SeedTimeNorm = {
  id: string;
  aktivitet: string;
  enhet: Unit;
  timmarPerEnhet: number;
  tradeId: string;
  kod: string;
};

const timeNorms: SeedTimeNorm[] = [
  { id: "seed-tn-001", aktivitet: "Montera gipsskiva på vägg", enhet: Unit.m2, timmarPerEnhet: 0.25, tradeId: "seed-trade-snickare", kod: "GIPS" },
  { id: "seed-tn-002", aktivitet: "Resa träregelstomme, vägg", enhet: Unit.m2, timmarPerEnhet: 0.35, tradeId: "seed-trade-snickare", kod: "STOMME" },
  { id: "seed-tn-003", aktivitet: "Montera isolering i vägg", enhet: Unit.m2, timmarPerEnhet: 0.12, tradeId: "seed-trade-snickare", kod: "ISOLERING" },
  { id: "seed-tn-004", aktivitet: "Lägga golvskiva", enhet: Unit.m2, timmarPerEnhet: 0.18, tradeId: "seed-trade-snickare", kod: "GOLV" },
  { id: "seed-tn-005", aktivitet: "Dra installationskabel", enhet: Unit.m, timmarPerEnhet: 0.06, tradeId: "seed-trade-elektriker", kod: "KABEL" },
  { id: "seed-tn-006", aktivitet: "Montera apparatdosa", enhet: Unit.st, timmarPerEnhet: 0.25, tradeId: "seed-trade-elektriker", kod: "DOSA" },
  { id: "seed-tn-007", aktivitet: "Montera uttag/strömbrytare", enhet: Unit.st, timmarPerEnhet: 0.35, tradeId: "seed-trade-elektriker", kod: "EL-MONTAGE" },
  { id: "seed-tn-008", aktivitet: "Dra avloppsrör", enhet: Unit.m, timmarPerEnhet: 0.4, tradeId: "seed-trade-vvs", kod: "AVLOPP" },
  { id: "seed-tn-009", aktivitet: "Montera golvbrunn", enhet: Unit.st, timmarPerEnhet: 2.5, tradeId: "seed-trade-vvs", kod: "GOLVBRUNN" },
  { id: "seed-tn-010", aktivitet: "Montera WC-stol", enhet: Unit.st, timmarPerEnhet: 1.5, tradeId: "seed-trade-vvs", kod: "WC" },
  { id: "seed-tn-011", aktivitet: "Mura vägg, lättbetong", enhet: Unit.m2, timmarPerEnhet: 0.9, tradeId: "seed-trade-murare", kod: "MURNING" },
  { id: "seed-tn-012", aktivitet: "Lägga armeringsnät", enhet: Unit.m2, timmarPerEnhet: 0.15, tradeId: "seed-trade-murare", kod: "ARMERING" },
];

async function main() {
  console.log("Seedar ByggKalkyl (EXEMPELDATA – ej verkliga priser/tider)...");

  for (const t of trades) {
    await prisma.trade.upsert({
      where: { id: t.id },
      update: { namn: t.namn, timpris: t.timpris },
      create: t,
    });
  }
  console.log(`  ✓ ${trades.length} yrken`);

  for (const r of resources) {
    await prisma.resource.upsert({
      where: { id: r.id },
      update: {
        leverantor: r.leverantor,
        artikelnr: r.artikelnr,
        benamning: r.benamning,
        enhet: r.enhet,
        bruttopris: r.bruttopris,
        prisProvider: PriceProviderType.INTERNAL,
        varugrupp: r.varugrupp,
      },
      create: {
        id: r.id,
        leverantor: r.leverantor,
        artikelnr: r.artikelnr,
        benamning: r.benamning,
        enhet: r.enhet,
        bruttopris: r.bruttopris,
        prisProvider: PriceProviderType.INTERNAL,
        varugrupp: r.varugrupp,
      },
    });
  }
  console.log(`  ✓ ${resources.length} material (EXEMPELDATA)`);

  for (const d of discountRules) {
    await prisma.discountRule.upsert({
      where: { id: d.id },
      update: { leverantor: d.leverantor, varugrupp: d.varugrupp, rabattProcent: d.rabattProcent },
      create: d,
    });
  }
  console.log(`  ✓ ${discountRules.length} rabattbrev`);

  for (const n of timeNorms) {
    await prisma.timeNorm.upsert({
      where: { id: n.id },
      update: {
        aktivitet: n.aktivitet,
        enhet: n.enhet,
        timmarPerEnhet: n.timmarPerEnhet,
        tradeId: n.tradeId,
        kod: n.kod,
        exempel: true,
      },
      create: {
        id: n.id,
        aktivitet: n.aktivitet,
        enhet: n.enhet,
        timmarPerEnhet: n.timmarPerEnhet,
        tradeId: n.tradeId,
        kod: n.kod,
        exempel: true,
        notering: "EXEMPELDATA – ersätt med egna normtider/historik",
      },
    });
  }
  console.log(`  ✓ ${timeNorms.length} tidsnormer (EXEMPEL)`);

  console.log("Klart.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
