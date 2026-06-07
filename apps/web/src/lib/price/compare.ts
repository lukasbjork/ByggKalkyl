import { applyDiscount, findDiscountPercent, type DiscountRuleLike } from "./discount";

/** Minsta form av en resurs (funkar med Prisma-rad eller testdata). */
export interface ResourceLike {
  id: string;
  leverantor: string;
  benamning: string;
  enhet: string;
  varugrupp: string | null;
  bruttopris: number | string | { toString(): string };
  gtin?: string | null;
  artikelnr?: string | null;
}

export interface PricedResource {
  resourceId: string;
  leverantor: string;
  benamning: string;
  enhet: string;
  bruttopris: number;
  rabattProcent: number;
  nettopris: number;
}

/** Räkna ut netto för en resurs efter dess leverantörs rabattbrev. */
export function priceResource(r: ResourceLike, rules: DiscountRuleLike[]): PricedResource {
  const brutto = Number(r.bruttopris);
  const rabatt = findDiscountPercent(r.leverantor, r.varugrupp, rules);
  return {
    resourceId: r.id,
    leverantor: r.leverantor,
    benamning: r.benamning,
    enhet: r.enhet,
    bruttopris: brutto,
    rabattProcent: rabatt,
    nettopris: applyDiscount(brutto, rabatt),
  };
}

/** Sortera resurser på nettopris (billigast först). */
export function rankByNet(resources: ResourceLike[], rules: DiscountRuleLike[]): PricedResource[] {
  return resources.map((r) => priceResource(r, rules)).sort((a, b) => a.nettopris - b.nettopris);
}

/** Billigaste resursen (netto) – eller null om inga. */
export function cheapest(
  resources: ResourceLike[],
  rules: DiscountRuleLike[],
): PricedResource | null {
  return rankByNet(resources, rules)[0] ?? null;
}

/**
 * Nyckel för "samma fysiska artikel" över leverantörer:
 *  - GTIN/EAN om satt (mest exakt), annars normaliserad benämning + enhet.
 */
export function equivalenceKey(r: ResourceLike): string {
  if (r.gtin && r.gtin.trim()) return `gtin:${r.gtin.trim().toLowerCase()}`;
  return `b:${r.benamning.trim().toLowerCase()}|${r.enhet}`;
}

/** Resurser som är ekvivalenta med `target` (samma artikel, andra leverantörer). */
export function equivalentsOf(target: ResourceLike, all: ResourceLike[]): ResourceLike[] {
  const key = equivalenceKey(target);
  return all.filter((r) => equivalenceKey(r) === key);
}
