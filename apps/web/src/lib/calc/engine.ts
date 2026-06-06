import Decimal from "decimal.js";

/**
 * Kalkylmotor – rena funktioner (testas med Vitest).
 *
 * Per post:
 *   materialkostnad = mängd × nettoÀpris
 *   arbetstimmar    = mängd × timmarPerEnhet
 *   arbetskostnad   = arbetstimmar × timpris
 *   radtotal        = (material + arbete) × (1 + omkostnad%) + materialpåslag + risk
 *
 * Poster utan pris eller tidsnorm räknas som 0 men FLAGGAS (aldrig tyst 0).
 * Endast granskade poster ingår i kalkylen.
 */

export interface CalcSettings {
  omkostnadProcent: number;
  materialPaslagProcent: number;
  riskProcent: number;
  arbetsdagTimmar: number;
}

export const DEFAULT_SETTINGS: CalcSettings = {
  omkostnadProcent: 0,
  materialPaslagProcent: 0,
  riskProcent: 0,
  arbetsdagTimmar: 8,
};

export interface CalcInputItem {
  id: string;
  benamning: string;
  kod: string | null;
  byggdel?: string | null;
  mangd: number;
  enhet: string;
  granskad: boolean;
  /** Netto-à-pris (efter rabatt). null = saknar pris. */
  nettoApris: number | null;
  leverantor?: string | null;
  /** Enhetstid. null = saknar tidsnorm. */
  timmarPerEnhet: number | null;
  yrke?: string | null;
  timpris: number | null;
}

export interface CalcLine {
  takeoffItemId: string;
  benamning: string;
  kod: string | null;
  byggdel: string | null;
  mangd: number;
  enhet: string;
  leverantor: string | null;
  nettoApris: number | null;
  materialkostnad: number;
  yrke: string | null;
  timmarPerEnhet: number | null;
  arbetstimmar: number;
  timpris: number | null;
  arbetskostnad: number;
  omkostnad: number;
  materialPaslag: number;
  risk: number;
  radtotal: number;
  saknarPris: boolean;
  saknarTidsnorm: boolean;
}

export interface TidPerYrke {
  yrke: string;
  timmar: number;
  kostnad: number;
}

export interface CalcResult {
  lines: CalcLine[];
  totalMaterial: number;
  totalArbete: number;
  totalOmkostnad: number;
  totalRisk: number;
  grandTotal: number;
  totalArbetstimmar: number;
  arbetsdagTimmar: number;
  totalDagar: number;
  tidPerYrke: TidPerYrke[];
  antalPoster: number;
  antalSaknarPris: number;
  antalSaknarTidsnorm: number;
}

const money = (d: Decimal): number => d.toDecimalPlaces(2).toNumber();
const hours = (d: Decimal): number => d.toDecimalPlaces(3).toNumber();

/** Beräkna en kalkylrad för en post. */
export function computeLine(item: CalcInputItem, settings: CalcSettings): CalcLine {
  const mangd = new Decimal(item.mangd || 0);

  const saknarPris = item.nettoApris == null;
  const saknarTidsnorm = item.timmarPerEnhet == null || item.timpris == null;

  const netto = saknarPris ? new Decimal(0) : new Decimal(item.nettoApris as number);
  const material = mangd.mul(netto);

  const tph = item.timmarPerEnhet == null ? new Decimal(0) : new Decimal(item.timmarPerEnhet);
  const arbetstimmar = mangd.mul(tph);
  const timpris = item.timpris == null ? new Decimal(0) : new Decimal(item.timpris);
  const arbete = arbetstimmar.mul(timpris);

  const base = material.add(arbete);
  const omkostnad = base.mul(settings.omkostnadProcent).div(100);
  const materialPaslag = material.mul(settings.materialPaslagProcent).div(100);
  const risk = base.mul(settings.riskProcent).div(100);
  const radtotal = base.add(omkostnad).add(materialPaslag).add(risk);

  return {
    takeoffItemId: item.id,
    benamning: item.benamning,
    kod: item.kod ?? null,
    byggdel: item.byggdel ?? item.kod ?? null,
    mangd: item.mangd,
    enhet: item.enhet,
    leverantor: item.leverantor ?? null,
    nettoApris: item.nettoApris,
    materialkostnad: money(material),
    yrke: item.yrke ?? null,
    timmarPerEnhet: item.timmarPerEnhet,
    arbetstimmar: hours(arbetstimmar),
    timpris: item.timpris,
    arbetskostnad: money(arbete),
    omkostnad: money(omkostnad),
    materialPaslag: money(materialPaslag),
    risk: money(risk),
    radtotal: money(radtotal),
    saknarPris,
    saknarTidsnorm,
  };
}

/** Beräkna hela kalkylen från granskade poster. */
export function computeCalculation(
  items: CalcInputItem[],
  settings: CalcSettings,
): CalcResult {
  const granskade = items.filter((i) => i.granskad);
  const lines = granskade.map((i) => computeLine(i, settings));

  let totalMaterial = new Decimal(0);
  let totalArbete = new Decimal(0);
  let totalOmkostnad = new Decimal(0);
  let totalRisk = new Decimal(0);
  let grandTotal = new Decimal(0);
  let totalArbetstimmar = new Decimal(0);

  const yrkeMap = new Map<string, { timmar: Decimal; kostnad: Decimal }>();

  for (const l of lines) {
    totalMaterial = totalMaterial.add(l.materialkostnad);
    totalArbete = totalArbete.add(l.arbetskostnad);
    totalOmkostnad = totalOmkostnad.add(l.omkostnad).add(l.materialPaslag);
    totalRisk = totalRisk.add(l.risk);
    grandTotal = grandTotal.add(l.radtotal);
    totalArbetstimmar = totalArbetstimmar.add(l.arbetstimmar);

    if (l.yrke && l.arbetstimmar > 0) {
      const cur = yrkeMap.get(l.yrke) ?? { timmar: new Decimal(0), kostnad: new Decimal(0) };
      cur.timmar = cur.timmar.add(l.arbetstimmar);
      cur.kostnad = cur.kostnad.add(l.arbetskostnad);
      yrkeMap.set(l.yrke, cur);
    }
  }

  const arbetsdag = new Decimal(settings.arbetsdagTimmar || 8);
  const tidPerYrke: TidPerYrke[] = [...yrkeMap.entries()]
    .map(([yrke, v]) => ({
      yrke,
      timmar: hours(v.timmar),
      kostnad: money(v.kostnad),
    }))
    .sort((a, b) => b.timmar - a.timmar);

  return {
    lines,
    totalMaterial: money(totalMaterial),
    totalArbete: money(totalArbete),
    totalOmkostnad: money(totalOmkostnad),
    totalRisk: money(totalRisk),
    grandTotal: money(grandTotal),
    totalArbetstimmar: hours(totalArbetstimmar),
    arbetsdagTimmar: settings.arbetsdagTimmar,
    totalDagar: arbetsdag.isZero()
      ? 0
      : totalArbetstimmar.div(arbetsdag).toDecimalPlaces(2).toNumber(),
    tidPerYrke,
    antalPoster: lines.length,
    antalSaknarPris: lines.filter((l) => l.saknarPris).length,
    antalSaknarTidsnorm: lines.filter((l) => l.saknarTidsnorm).length,
  };
}
