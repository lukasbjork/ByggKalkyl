import { InternalPriceProvider } from "./internal";
import type { PriceProvider } from "./types";

export * from "./types";
export { applyDiscount, findDiscountPercent } from "./discount";
export { EdiCatalogProvider } from "./edi";
export { FinfoProvider } from "./finfo";
export { InternalPriceProvider } from "./internal";

/**
 * Standard-prisprovider. Byt här när en riktig källa (Finfo/EDI) ska användas.
 * (PRICE_PROVIDER-env kan styra detta senare.)
 */
export function getPriceProvider(): PriceProvider {
  return new InternalPriceProvider();
}
