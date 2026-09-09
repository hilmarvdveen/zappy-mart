import type { Category, Product } from "../../domain/product.js";
import {
  productChanged,
  wholeCatalogueChanged,
  type ProductChanged
} from "../../domain/productChanged.js";
import type { ProductChangeListener, ProductRepository } from "../../application/ports.js";

export type CatalogueCacheCounters = {
  readonly databaseReads: number;
  readonly cacheHits: number;
  readonly invalidations: number;
};

export type CachedCatalogue = {
  readonly repository: ProductRepository;
  readonly listener: ProductChangeListener;
  counters(): CatalogueCacheCounters;
};

export function cachedProductRepository(
  stored: ProductRepository,
  now: () => Date,
  otherListeners: readonly ProductChangeListener[] = []
): CachedCatalogue {
  let cachedCatalogue: readonly Product[] | null = null;
  let databaseReads = 0;
  let cacheHits = 0;
  let invalidations = 0;

  const listener: ProductChangeListener = {
    productChanged(event: ProductChanged): void {
      cachedCatalogue = null;
      invalidations = invalidations + 1;
      for (const other of otherListeners) {
        other.productChanged(event);
      }
    }
  };

  async function catalogueInOrder(): Promise<readonly Product[]> {
    if (cachedCatalogue !== null) {
      cacheHits = cacheHits + 1;
      return cachedCatalogue;
    }
    databaseReads = databaseReads + 1;
    cachedCatalogue = await stored.readAllInCatalogueOrder();
    return cachedCatalogue;
  }

  const repository: ProductRepository = {
    async readAllInCatalogueOrder(): Promise<readonly Product[]> {
      return catalogueInOrder();
    },

    async readBySlug(slug: string): Promise<Product | null> {
      return (await catalogueInOrder()).find((product) => product.slug === slug) ?? null;
    },

    async readManyByIdentifier(identifiers: readonly string[]): Promise<readonly Product[]> {
      const wanted = new Set(identifiers);
      return (await catalogueInOrder()).filter((product) => wanted.has(product.id));
    },

    async writeStock(productId: string, stock: number): Promise<void> {
      await stored.writeStock(productId, stock);
      listener.productChanged(productChanged(productId, now().toISOString()));
    },

    async replaceCatalogue(products: readonly Product[], categories: readonly Category[]): Promise<void> {
      await stored.replaceCatalogue(products, categories);
      listener.productChanged(wholeCatalogueChanged(now().toISOString()));
    }
  };

  return {
    repository,
    listener,
    counters(): CatalogueCacheCounters {
      return { databaseReads, cacheHits, invalidations };
    }
  };
}
