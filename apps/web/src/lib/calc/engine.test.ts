import { describe, it, expect } from "vitest";

import {
  computeLine,
  computeCalculation,
  type CalcSettings,
  type CalcInputItem,
} from "./engine";

const settings: CalcSettings = {
  omkostnadProcent: 10,
  materialPaslagProcent: 0,
  riskProcent: 5,
  arbetsdagTimmar: 8,
};

describe("computeLine", () => {
  it("beräknar material, arbete, omkostnad, risk och radtotal", () => {
    const item: CalcInputItem = {
      id: "1",
      benamning: "Gipsskiva",
      kod: "GIPS",
      mangd: 10,
      enhet: "m2",
      granskad: true,
      nettoApris: 76,
      timmarPerEnhet: 0.25,
      timpris: 500,
      yrke: "Snickare",
    };
    const l = computeLine(item, settings);
    expect(l.materialkostnad).toBe(760); // 10 × 76
    expect(l.arbetstimmar).toBe(2.5); // 10 × 0.25
    expect(l.arbetskostnad).toBe(1250); // 2.5 × 500
    // base = 2010, omkostnad 10% = 201, risk 5% = 100.5
    expect(l.omkostnad).toBe(201);
    expect(l.risk).toBe(100.5);
    expect(l.radtotal).toBe(2311.5);
    expect(l.saknarPris).toBe(false);
    expect(l.saknarTidsnorm).toBe(false);
  });

  it("flaggar saknat pris (material = 0 men flaggas, ej tyst 0)", () => {
    const item: CalcInputItem = {
      id: "2",
      benamning: "Utan pris",
      kod: null,
      mangd: 5,
      enhet: "st",
      granskad: true,
      nettoApris: null,
      timmarPerEnhet: 0.5,
      timpris: 600,
      yrke: "Elektriker",
    };
    const l = computeLine(item, settings);
    expect(l.materialkostnad).toBe(0);
    expect(l.saknarPris).toBe(true);
    expect(l.arbetskostnad).toBe(1500); // 5 × 0.5 × 600
  });

  it("flaggar saknad tidsnorm (arbete = 0 men flaggas)", () => {
    const item: CalcInputItem = {
      id: "3",
      benamning: "Utan tidsnorm",
      kod: null,
      mangd: 4,
      enhet: "st",
      granskad: true,
      nettoApris: 100,
      timmarPerEnhet: null,
      timpris: null,
      yrke: null,
    };
    const l = computeLine(item, settings);
    expect(l.arbetskostnad).toBe(0);
    expect(l.saknarTidsnorm).toBe(true);
    expect(l.materialkostnad).toBe(400);
  });
});

describe("computeCalculation", () => {
  it("summerar endast granskade poster och tid per yrke", () => {
    const items: CalcInputItem[] = [
      {
        id: "1",
        benamning: "Gips",
        kod: "GIPS",
        mangd: 10,
        enhet: "m2",
        granskad: true,
        nettoApris: 76,
        timmarPerEnhet: 0.25,
        timpris: 500,
        yrke: "Snickare",
      },
      {
        id: "2",
        benamning: "Kabel",
        kod: "KABEL",
        mangd: 100,
        enhet: "m",
        granskad: true,
        nettoApris: 8.4,
        timmarPerEnhet: 0.06,
        timpris: 600,
        yrke: "Elektriker",
      },
      {
        id: "3",
        benamning: "Ej granskad",
        kod: null,
        mangd: 999,
        enhet: "st",
        granskad: false,
        nettoApris: 1000,
        timmarPerEnhet: 10,
        timpris: 1000,
        yrke: "Spöke",
      },
    ];
    const r = computeCalculation(items, settings);
    expect(r.antalPoster).toBe(2); // ogranskad post exkluderas
    expect(r.totalMaterial).toBe(1600); // 760 + 840
    expect(r.totalArbete).toBe(4850); // 1250 + 3600
    expect(r.totalArbetstimmar).toBe(8.5); // 2.5 + 6
    expect(r.totalDagar).toBe(1.06); // 8.5 / 8 ≈ 1.0625
    expect(r.tidPerYrke).toHaveLength(2);
    expect(r.tidPerYrke.find((t) => t.yrke === "Snickare")?.timmar).toBe(2.5);
    expect(r.tidPerYrke.find((t) => t.yrke === "Elektriker")?.timmar).toBe(6);
  });

  it("flaggar antal poster utan pris/tidsnorm", () => {
    const items: CalcInputItem[] = [
      {
        id: "1",
        benamning: "Utan pris",
        kod: null,
        mangd: 1,
        enhet: "st",
        granskad: true,
        nettoApris: null,
        timmarPerEnhet: 1,
        timpris: 500,
        yrke: "Snickare",
      },
    ];
    const r = computeCalculation(items, settings);
    expect(r.antalSaknarPris).toBe(1);
    expect(r.antalSaknarTidsnorm).toBe(0);
  });
});
