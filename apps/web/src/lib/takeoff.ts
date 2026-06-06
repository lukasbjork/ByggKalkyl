import { Prisma, TakeoffSource, Unit } from "@prisma/client";

import { prisma } from "./db";

/** Normalisera en enhetssträng till Unit-enum. Returnerar null om okänd. */
export function toUnit(raw: string): Unit | null {
  const s = raw.trim().toLowerCase().replace("²", "2").replace("³", "3");
  switch (s) {
    case "st":
    case "stk":
    case "styck":
    case "pcs":
      return Unit.st;
    case "m":
    case "lpm":
    case "lm":
    case "löpmeter":
    case "lopmeter":
      return Unit.m;
    case "m2":
    case "kvm":
    case "kvadratmeter":
      return Unit.m2;
    case "m3":
    case "kubikmeter":
      return Unit.m3;
    case "kg":
    case "kilo":
      return Unit.kg;
    case "h":
    case "tim":
    case "timme":
    case "timmar":
      return Unit.h;
    default:
      return null;
  }
}

export interface NewTakeoffRow {
  benamning: string;
  kod?: string | null;
  mangd: number;
  enhet: string;
  lage?: string | null;
  konfidens?: number | null;
  antagande?: string | null;
}

/**
 * Skapa flera TakeoffItem-rader (alltid ogranskade – inget räknas förrän granskat).
 * Ogiltiga enheter mappas till 'st' med antagande-notering.
 */
export async function createTakeoffItems(
  projectId: string,
  sourceDocumentId: string | null,
  kalla: TakeoffSource,
  rows: NewTakeoffRow[],
) {
  const data: Prisma.TakeoffItemCreateManyInput[] = rows.map((r) => {
    const enhet = toUnit(r.enhet);
    const antaganden = [r.antagande ?? ""].filter(Boolean);
    if (!enhet) antaganden.push(`Okänd enhet "${r.enhet}" – satt till st`);
    return {
      projectId,
      sourceDocumentId,
      kod: r.kod ?? null,
      benamning: r.benamning,
      mangd: new Prisma.Decimal(Number.isFinite(r.mangd) ? r.mangd : 0),
      enhet: enhet ?? Unit.st,
      lageskod: r.lage ?? null,
      kalla,
      konfidens:
        r.konfidens == null ? null : new Prisma.Decimal(r.konfidens),
      antagande: antaganden.length ? antaganden.join("; ") : null,
      granskad: false,
    };
  });

  await prisma.takeoffItem.createMany({ data });
  return data.length;
}
