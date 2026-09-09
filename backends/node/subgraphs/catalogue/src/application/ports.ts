import type { Category, Product } from "../domain/product.js";
import type { ProductChanged } from "../domain/productChanged.js";
import type { StockLine } from "../domain/stockReservation.js";

export type ProductRepository = {
  readAllInCatalogueOrder(): Promise<readonly Product[]>;
  readBySlug(slug: string): Promise<Product | null>;
  readManyByIdentifier(identifiers: readonly string[]): Promise<readonly Product[]>;
  writeStock(productId: string, stock: number): Promise<void>;
  replaceCatalogue(products: readonly Product[], categories: readonly Category[]): Promise<void>;
};

export type CategoryRepository = {
  readAllInSeedOrder(): Promise<readonly Category[]>;
  readBySlug(slug: string): Promise<Category | null>;
};

export type StockReservationStore = {
  readByIdempotencyKey(idempotencyKey: string): Promise<readonly StockLine[] | null>;
  write(idempotencyKey: string, lines: readonly StockLine[], recordedAt: string): Promise<void>;
  remove(idempotencyKey: string): Promise<void>;
};

export type ProductChangeListener = {
  productChanged(event: ProductChanged): void;
};
