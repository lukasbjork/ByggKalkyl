import { describe, it, expect } from "vitest";

import { cheapest, rankByNet, equivalenceKey, equivalentsOf } from "./compare";
import type { ResourceLike } from "./compare";

const rules = [
  { leverantor: "Beijer", varugrupp: null, rabattProcent: 20 },
  { leverantor: "Ahlsell", varugrupp: null, rabattProcent: 30 },
];

const beijer: ResourceLike = {
  id: "b1",
  leverantor: "Beijer",
  benamning: "Gipsskiva 13mm",
  enhet: "m2",
  varugrupp: "Gips",
  bruttopris: 95,
  gtin: "7350001",
};
const ahlsell: ResourceLike = {
  id: "a1",
  leverantor: "Ahlsell",
  benamning: "Gipsskiva 13 mm", // annan stavning – men samma GTIN
  enhet: "m2",
  varugrupp: "Gips",
  bruttopris: 100,
  gtin: "7350001",
};

describe("cheapest", () => {
  it("väljer billigaste NETTO efter respektive rabattbrev", () => {
    // Beijer 95 ×0.8 = 76 ; Ahlsell 100 ×0.7 = 70 → Ahlsell billigast
    const c = cheapest([beijer, ahlsell], rules);
    expect(c?.leverantor).toBe("Ahlsell");
    expect(c?.nettopris).toBe(70);
  });

  it("rankar billigast först", () => {
    const r = rankByNet([beijer, ahlsell], rules);
    expect(r.map((x) => x.leverantor)).toEqual(["Ahlsell", "Beijer"]);
    expect(r[1].nettopris).toBe(76);
  });

  it("null vid inga resurser", () => {
    expect(cheapest([], rules)).toBeNull();
  });
});

describe("ekvivalens", () => {
  it("samma GTIN = samma artikel oavsett stavning", () => {
    expect(equivalenceKey(beijer)).toBe(equivalenceKey(ahlsell));
    expect(equivalentsOf(beijer, [beijer, ahlsell])).toHaveLength(2);
  });

  it("utan GTIN faller tillbaka på benämning+enhet", () => {
    const x: ResourceLike = { id: "x", leverantor: "X", benamning: "Regel 45x95", enhet: "m", varugrupp: "Virke", bruttopris: 28 };
    const y: ResourceLike = { id: "y", leverantor: "Y", benamning: "regel 45x95", enhet: "m", varugrupp: "Virke", bruttopris: 25 };
    expect(equivalenceKey(x)).toBe(equivalenceKey(y));
  });
});
