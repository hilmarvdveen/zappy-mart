import DataLoader from "dataloader";
import type { Category, Product } from "../../domain/product.js";
import type { CategoryRepository, ProductRepository } from "../../application/ports.js";

export function productLoader(products: ProductRepository): DataLoader<string, Product | null> {
  return new DataLoader<string, Product | null>(async (identifiers) => {
    const found = await products.readManyByIdentifier([...identifiers]);
    const byIdentifier = new Map(found.map((product) => [product.id, product]));
    return identifiers.map((identifier) => byIdentifier.get(identifier) ?? null);
  });
}

export function categoryLoader(categories: CategoryRepository): DataLoader<string, Category | null> {
  return new DataLoader<string, Category | null>(async (slugs) => {
    const all = await categories.readAllInSeedOrder();
    const bySlug = new Map(all.map((category) => [category.slug, category]));
    return slugs.map((slug) => bySlug.get(slug) ?? null);
  });
}
