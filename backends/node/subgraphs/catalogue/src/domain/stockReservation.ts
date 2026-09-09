import type { Product } from "./product.js";
import { hasStockFor } from "./product.js";

export type StockLine = {
  readonly productId: string;
  readonly quantity: number;
};

export type StockReservationOutcome =
  | { readonly kind: "reserved"; readonly reduced: readonly Product[] }
  | { readonly kind: "unavailable"; readonly productId: string; readonly availableStock: number };

export function reserveAllOrNothing(
  stocked: ReadonlyMap<string, Product>,
  lines: readonly StockLine[]
): StockReservationOutcome {
  const reduced: Product[] = [];
  for (const line of lines) {
    const product = stocked.get(line.productId);
    if (product === undefined) {
      return { kind: "unavailable", productId: line.productId, availableStock: 0 };
    }
    if (!hasStockFor(product, line.quantity)) {
      return { kind: "unavailable", productId: line.productId, availableStock: product.stock };
    }
    reduced.push({ ...product, stock: product.stock - line.quantity });
  }
  return { kind: "reserved", reduced };
}
