import { prisma } from "./db";

export interface MatchResult {
  matched: number;
  unmatched: number;
  total: number;
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();
const tokens = (s: string) =>
  lc(s)
    .split(/[\s,/()-]+/)
    .filter((t) => t.length >= 3);

/**
 * Auto-matcha tidsnormer mot poster utan koppling.
 * 1) exakt kod, 2) normens kod som delsträng i benämning/kod,
 * 3) ord (≥4) ur normens aktivitet som förekommer i benämningen.
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
      else {
        const words = lc(n.aktivitet)
          .split(/\s+/)
          .filter((w) => w.length >= 4);
        if (words.some((w) => lc(item.benamning).includes(w))) tier = 1;
      }
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
 * Auto-matcha priser (Resource) mot poster utan koppling.
 * Poäng: artikelnr=kod (starkt), ordträffar i benämning, samma enhet (bonus).
 */
export async function autoMatchPrices(projectId: string): Promise<MatchResult> {
  const [items, resources] = await Promise.all([
    prisma.takeoffItem.findMany({ where: { projectId, kopplatResourceId: null } }),
    prisma.resource.findMany(),
  ]);

  let matched = 0;
  for (const item of items) {
    const itemTokens = tokens(item.benamning);
    let best: { id: string; score: number } | null = null;

    for (const res of resources) {
      let score = 0;
      if (item.kod && res.artikelnr && lc(item.kod) === lc(res.artikelnr)) score += 10;
      const resBen = lc(res.benamning);
      const hits = itemTokens.filter((t) => resBen.includes(t)).length;
      score += hits;
      // kräver minst en riktig träff (inte bara enhet)
      if (score === 0) continue;
      if (res.enhet === item.enhet) score += 1;
      if (!best || score > best.score) best = { id: res.id, score };
    }

    if (best && best.score > 0) {
      await prisma.takeoffItem.update({
        where: { id: item.id },
        data: { kopplatResourceId: best.id },
      });
      matched++;
    }
  }
  return { matched, unmatched: items.length - matched, total: items.length };
}
