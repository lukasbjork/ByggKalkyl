import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Auto-matcha tidsnormer mot poster som saknar koppling.
 * Matchning: 1) exakt kod, 2) normens kod som delsträng i benämning/kod,
 * 3) ord (≥4 tecken) ur normens aktivitet som förekommer i benämningen.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const [items, norms] = await Promise.all([
    prisma.takeoffItem.findMany({
      where: { projectId: params.id, kopplatTimeNormId: null },
    }),
    prisma.timeNorm.findMany(),
  ]);

  const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

  let matched = 0;
  for (const item of items) {
    const hay = `${lc(item.kod)} ${lc(item.benamning)}`;
    let best: { id: string; tier: number } | null = null;

    for (const n of norms) {
      let tier = 0;
      if (item.kod && n.kod && lc(item.kod) === lc(n.kod)) {
        tier = 3;
      } else if (n.kod && hay.includes(lc(n.kod))) {
        tier = 2;
      } else {
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

  return NextResponse.json({
    matched,
    unmatched: items.length - matched,
    total: items.length,
  });
}
