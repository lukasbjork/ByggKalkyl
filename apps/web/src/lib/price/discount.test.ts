import { describe, it, expect } from "vitest";

import { findDiscountPercent, applyDiscount } from "./discount";

// Rabattbrev (rabattProcent skickas som Decimal i prod; number duger i testet).
const rules = [
  { leverantor: "Beijer", varugrupp: null, rabattProcent: 20 },
  { leverantor: "Beijer", varugrupp: "Virke", rabattProcent: 30 },
  { leverantor: "Ahlsell", varugrupp: "El-kabel", rabattProcent: 40 },
  { leverantor: "Ahlsell", varugrupp: null, rabattProcent: 25 },
] as unknown as Parameters<typeof findDiscountPercent>[2];

describe("findDiscountPercent", () => {
  it("specifik varugrupp vinner över generell", () => {
    expect(findDiscountPercent("Beijer", "Virke", rules)).toBe(30);
    expect(findDiscountPercent("Ahlsell", "El-kabel", rules)).toBe(40);
  });

  it("faller tillbaka på generell (varugrupp null) regel", () => {
    expect(findDiscountPercent("Beijer", "Gips", rules)).toBe(20);
    expect(findDiscountPercent("Ahlsell", "VVS-rör", rules)).toBe(25);
  });

  it("0 % om ingen regel matchar leverantören", () => {
    expect(findDiscountPercent("Optimera", "Betong", rules)).toBe(0);
  });
});

describe("applyDiscount", () => {
  it("netto = brutto × (1 − rabatt%)", () => {
    expect(applyDiscount(95, 20)).toBe(76);
    expect(applyDiscount(28, 30)).toBe(19.6);
    expect(applyDiscount(14, 40)).toBe(8.4);
    expect(applyDiscount(100, 0)).toBe(100);
  });
});
