import type { PriceProvider, PriceQuery, PriceResult } from "./types";

/**
 * Finfo/GS1-Validoo-koppling (STUB).
 *
 * Riktig prisåtkomst kräver ett Finfo-abonnemang (GDSN/GS1-Validoo) eller motsvarande
 * kommersiell datakälla. Detta är medvetet inte implementerat – bygg signaturen, inte
 * integrationen, tills avtal finns.
 *
 * TODO: lägg credentials i env (t.ex. FINFO_API_URL, FINFO_API_KEY) och implementera lookup.
 * Kontakt/avtal: https://www.finfo.se / GS1 Sweden (Validoo).
 */
export class FinfoProvider implements PriceProvider {
  readonly name = "FINFO";

  async lookup(_query: PriceQuery): Promise<PriceResult[]> {
    throw new Error(
      "Finfo-provider är inte konfigurerad – kräver Finfo-abonnemang (GS1-Validoo/GDSN). " +
        "Lägg till credentials i .env och implementera FinfoProvider.lookup.",
    );
  }
}
