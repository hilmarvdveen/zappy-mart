import { cache } from "react";

import { catalogueSize } from "@/configuration";
import type {
  CatalogueQuery,
  CategoriesQuery,
  ProductBySlugQuery,
} from "@/graphql/generated/graphql";
import {
  catalogueQuery,
  categoriesQuery,
  productBySlugQuery,
} from "@/graphql/operations";
import type { CatalogueSelection } from "@/server/catalogueSelection";
import { readFromApi } from "@/server/storefrontClient";

export const readCategories = cache(
  async (): Promise<CategoriesQuery | null> => readFromApi(categoriesQuery, {}),
);

export async function readCatalogue(
  selection: CatalogueSelection,
): Promise<CatalogueQuery | null> {
  return readFromApi(catalogueQuery, {
    filter: {
      categorySlug: selection.categorySlug,
      nameContains: selection.searchTerm,
      inStockOnly: selection.inStockOnly,
    },
    first: catalogueSize,
    after: null,
  });
}

export async function readProduct(
  slug: string,
): Promise<ProductBySlugQuery | null> {
  return readFromApi(productBySlugQuery, { slug });
}
