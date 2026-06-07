import { prisma } from "./db";
import { cheapest, equivalentsOf, type ResourceLike } from "./price/compare";
import { termOverlap } from "./synonyms";

export interface MatchResult {
  matched: number;
  unmatched: number;
  total: number;
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

/**
 * Auto-matcha tidsnormer mot poster utan koppling.
 * 1) exakt kod, 2) normens kod som delsträng i benämning/kod,
 * 3) gemensam (kanonisk) term mellan benämning och aktivitet (synonymordlista).
 */
export async function autoMatchTimeNorms(projectId: string): Promise<MatchResult> {
  const [items, norms] = await Promise.all([
    prisma.takeoffItem.findMany({ where: { projectId, kopplatTimeNormId: null } }),
    prisma.timeNorm.findMany(),
  ]);

  let matched = 0;
  for (const item of items) {
    const hay = `${lc(item.kod)} ${lc(item.benamning)}`;
    let best: { id: string; tier: number } | null = null;
    for (const n of norms) {
      let tier = 0;
      if (item.kod && n.kod && lc(item.kod) === lc(n.kod)) tier = 3;
      else if (n.kod && hay.includes(lc(n.kod))) tier = 2;
      else if (termOverlap(item.benamning, n.aktivitet) > 0) tier = 1;
      if (tier > 0 && (!best || tier > best.tier)) {
        best = { id: n.id, tier };
        if (tier === 3) break;
      }
    }
    if (best) {
      await prisma.takeoffItem.update({
        where: { id: item.id },
        data: { kopplatTimeNormId: best.id },
      });
      matched++;
    }
  }
  return { matched, unmatched: items.length - matched, total: items.length };
}

/**
 * Auto-matcha priser. Steg 1: hitta RÄTT artikel (artikelnr/gtin exakt > term-/
 * synonymträff, enhet som bonus). Steg 2: bland artikelns EKVIVALENTER (samma
 * gtin/benämning hos olika leverantörer) välj BILLIGASTE netto. Ger rätt artikel
 * från billigaste leverantören – automatiskt.
 */
export async function autoMatchPrices(projectId: string): Promise<MatchResult> {
  const [items, resources, rules] = await Promise.all([
    prisma.takeoffItem.findMany({ where: { projectId, kopplatResourceId: null } }),
    prisma.resource.findMany(),
    prisma.discountRule.findMany(),
  ]);
  const resLike = resources as unknown as ResourceLike[];

  let matched = 0;
  for (const item of items) {
    const hay = `${item.kod ?? ""} ${item.benamning}`;

    // Steg 1: bäst matchande artikel.
    let best: { res: (typeof resources)[number]; score: number } | null = null;
    for (const res of resources) {
      let score = 0;
      if (item.kod && res.artikelnr && lc(item.kod) === lc(res.artikelnr)) score += 100;
      if (item.kod && res.gtin && lc(item.kod) === lc(res.gtin)) score += 100;
      score += termOverlap(hay, res.benamning) * 5;
      if (res.enhet === item.enhet) score += 1;
      if (score <= 1) continue; // enhet ensam räcker inte – kräver term-/kodträff
      if (!best || score > best.score) best = { res, score };
    }
    if (!best) continue;

    // Steg 2: billigaste leverantören bland ekvivalenta artiklar.
    const equivalents = equivalentsOf(best.res as unknown as ResourceLike, resLike);
    const pick = cheapest(equivalents, rules);
    const resourceId = pick ? pick.resourceId : best.res.id;

    await prisma.takeoffItem.update({
      where: { id: item.id },
      data: { kopplatResourceId: resourceId },
    });
    matched++;
  }
  return { matched, unmatched: items.length - matched, total: items.length };
}
