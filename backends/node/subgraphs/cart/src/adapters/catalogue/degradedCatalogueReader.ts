import { throughCircuitBreaker, type CircuitBreaker } from "@zappy/shared";
import type { CataloguedProduct, CatalogueReader } from "../../application/ports.js";

export type LastKnownProducts = Map<string, CataloguedProduct>;

export function lastKnownProducts(): LastKnownProducts {
  return new Map<string, CataloguedProduct>();
}

export type DegradationCounters = {
  readonly answeredLive: number;
  readonly answeredFromLastKnown: number;
};

export type DegradedCatalogue = {
  readonly reader: CatalogueReader;
  counters(): DegradationCounters;
};

export function degradedCatalogueReader(
  live: CatalogueReader,
  breaker: CircuitBreaker,
  remembered: LastKnownProducts
): DegradedCatalogue {
  let answeredLive = 0;
  let answeredFromLastKnown = 0;

  function remember(products: readonly CataloguedProduct[]): void {
    for (const product of products) {
      remembered.set(product.id, product);
    }
  }

  return {
    reader: {
      async readProduct(productId: string): Promise<CataloguedProduct | null> {
        try {
          const product = await throughCircuitBreaker(breaker, () => live.readProduct(productId));
          answeredLive = answeredLive + 1;
          if (product !== null) {
            remember([product]);
          }
          return product;
        } catch {
          answeredFromLastKnown = answeredFromLastKnown + 1;
          return remembered.get(productId) ?? null;
        }
      },

      async readProducts(productIdentifiers: readonly string[]): Promise<readonly CataloguedProduct[]> {
        try {
          const products = await throughCircuitBreaker(breaker, () =>
            live.readProducts(productIdentifiers)
          );
          answeredLive = answeredLive + 1;
          remember(products);
          return products;
        } catch {
          answeredFromLastKnown = answeredFromLastKnown + 1;
          return productIdentifiers
            .map((identifier) => remembered.get(identifier))
            .filter((product): product is CataloguedProduct => product !== undefined);
        }
      }
    },

    counters(): DegradationCounters {
      return { answeredLive, answeredFromLastKnown };
    }
  };
}
