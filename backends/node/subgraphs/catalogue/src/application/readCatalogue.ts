import { limitPageSize, pageOf, type Page } from "@zappy/shared";
import type { Category, Product } from "../domain/product.js";
import { specificationFor, type CatalogueFilter } from "../domain/productSpecification.js";
import type { CategoryRepository, ProductRepository } from "./ports.js";

export const defaultProductPageSize = 24;

export type ReadCatalogue = {
  page(filter: CatalogueFilter | null, first: number | null, after: string | null): Promise<Page<Product>>;
  bySlug(slug: string): Promise<Product | null>;
  categories(): Promise<readonly Category[]>;
};

export function readCatalogue(
  products: ProductRepository,
  categories: CategoryRepository
): ReadCatalogue {
  return {
    async page(filter, first, after): Promise<Page<Product>> {
      const matching = (await products.readAllInCatalogueOrder()).filter(specificationFor(filter));
      return pageOf(matching, (product) => product.id, limitPageSize(first, defaultProductPageSize), after);
    },

    async bySlug(slug): Promise<Product | null> {
      return products.readBySlug(slug);
    },

    async categories(): Promise<readonly Category[]> {
      return categories.readAllInSeedOrder();
    }
  };
}
