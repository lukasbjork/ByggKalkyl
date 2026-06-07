/** Minsta form av ett rabattbrev (funkar med Prisma-rad eller testdata). */
export interface DiscountRuleLike {
  leverantor: string;
  varugrupp: string | null;
  rabattProcent: number | string | { toString(): string };
}

/**
 * Hitta tillämplig rabatt% för en resurs givet rabattbrev.
 * Mer specifik regel (matchande varugrupp) vinner över generell (varugrupp = null).
 */
export function findDiscountPercent(
  leverantor: string,
  varugrupp: string | null,
  rules: DiscountRuleLike[],
): number {
  const candidates = rules.filter(
    (r) =>
      r.leverantor === leverantor &&
      (r.varugrupp == null || r.varugrupp === varugrupp),
  );
  if (candidates.length === 0) return 0;

  const specific =
    varugrupp != null
      ? candidates.find((r) => r.varugrupp === varugrupp)
      : undefined;
  const chosen = specific ?? candidates.find((r) => r.varugrupp == null) ?? candidates[0];
  return Number(chosen.rabattProcent);
}

/** Netto-à-pris = brutto × (1 − rabatt%). Avrundat till ören. */
export function applyDiscount(bruttopris: number, rabattProcent: number): number {
  return Math.round(bruttopris * (1 - rabattProcent / 100) * 100) / 100;
}
