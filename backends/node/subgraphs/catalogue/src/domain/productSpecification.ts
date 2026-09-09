import type { Product } from "./product.js";

export type ProductSpecification = (product: Product) => boolean;

export type CatalogueFilter = {
  readonly categorySlug?: string | null;
  readonly nameContains?: string | null;
  readonly inStockOnly?: boolean | null;
};

export const everyProduct: ProductSpecification = () => true;

export function inCategory(categorySlug: string): ProductSpecification {
  return (product) => product.categorySlug === categorySlug;
}

export function nameContaining(text: string): ProductSpecification {
  const wanted = text.trim().toLowerCase();
  return (product) => product.name.toLowerCase().includes(wanted);
}

export const inStock: ProductSpecification = (product) => product.stock > 0;

export function allOf(specifications: readonly ProductSpecification[]): ProductSpecification {
  return (product) => specifications.every((specification) => specification(product));
}

export function specificationFor(filter: CatalogueFilter | null | undefined): ProductSpecification {
  if (filter === null || filter === undefined) {
    return everyProduct;
  }
  const parts: ProductSpecification[] = [];
  if (filter.categorySlug !== null && filter.categorySlug !== undefined) {
    parts.push(inCategory(filter.categorySlug));
  }
  if (filter.nameContains !== null && filter.nameContains !== undefined) {
    parts.push(nameContaining(filter.nameContains));
  }
  if (filter.inStockOnly === true) {
    parts.push(inStock);
  }
  return parts.length === 0 ? everyProduct : allOf(parts);
}
