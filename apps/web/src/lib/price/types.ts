/** Prislager bakom ett utbytbart interface. Standard = intern, seedbar prislista. */

export interface PriceQuery {
  artikelnr?: string;
  benamning: string;
  enhet?: string;
  leverantor?: string;
}

export interface PriceResult {
  resourceId: string;
  leverantor: string;
  artikelnr?: string | null;
  benamning: string;
  enhet: string;
  varugrupp?: string | null;
  bruttopris: number;
  nettopris: number;
  rabattProcent: number;
  provider: "INTERNAL" | "FINFO" | "EDI";
}

export interface PriceProvider {
  readonly name: string;
  lookup(query: PriceQuery): Promise<PriceResult[]>;
}
