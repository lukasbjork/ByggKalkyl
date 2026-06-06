import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { applyDiscount, findDiscountPercent } from "@/lib/price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista prislistan med beräknat nettopris efter rabattbrev. */
export async function GET() {
  const [resources, rules] = await Promise.all([
    prisma.resource.findMany({ orderBy: [{ leverantor: "asc" }, { benamning: "asc" }] }),
    prisma.discountRule.findMany(),
  ]);

  const data = resources.map((r) => {
    const brutto = Number(r.bruttopris);
    const rabatt = findDiscountPercent(r.leverantor, r.varugrupp, rules);
    return {
      id: r.id,
      leverantor: r.leverantor,
      artikelnr: r.artikelnr,
      benamning: r.benamning,
      enhet: r.enhet,
      varugrupp: r.varugrupp,
      bruttopris: brutto,
      rabattProcent: rabatt,
      nettopris: applyDiscount(brutto, rabatt),
      provider: r.prisProvider,
    };
  });

  return NextResponse.json(data);
}
