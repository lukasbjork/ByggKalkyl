import { Prisma } from "@prisma/client";

import { prisma } from "../db";
import { applyDiscount, findDiscountPercent } from "./discount";
import type { PriceProvider, PriceQuery, PriceResult } from "./types";

/** Läser intern prislista (Resource) och applicerar rabattbrev (DiscountRule). */
export class InternalPriceProvider implements PriceProvider {
  readonly name = "INTERNAL";

  async lookup(query: PriceQuery): Promise<PriceResult[]> {
    const tokens = query.benamning
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3)
      .slice(0, 5);

    const or: Prisma.ResourceWhereInput[] = [];
    if (query.artikelnr) {
      or.push({ artikelnr: { equals: query.artikelnr, mode: "insensitive" } });
    }
    for (const t of tokens) {
      or.push({ benamning: { contains: t, mode: "insensitive" } });
    }

    const where: Prisma.ResourceWhereInput = {};
    if (or.length > 0) where.OR = or;
    if (query.leverantor) where.leverantor = query.leverantor;

    const resources = await prisma.resource.findMany({
      where,
      take: 25,
      orderBy: { benamning: "asc" },
    });

    const rules = await prisma.discountRule.findMany();

    return resources.map((r) => {
      const brutto = Number(r.bruttopris);
      const rabatt = findDiscountPercent(r.leverantor, r.varugrupp, rules);
      return {
        resourceId: r.id,
        leverantor: r.leverantor,
        artikelnr: r.artikelnr,
        benamning: r.benamning,
        enhet: r.enhet,
        varugrupp: r.varugrupp,
        bruttopris: brutto,
        nettopris: applyDiscount(brutto, rabatt),
        rabattProcent: rabatt,
        provider: r.prisProvider,
      };
    });
  }
}
