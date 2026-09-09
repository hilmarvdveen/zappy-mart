import type { Money } from "@zappy/shared";

export type Product = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly price: Money;
  readonly categorySlug: string;
  readonly stock: number;
  readonly imageUrl: string | null;
};

export type Category = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export function hasStockFor(product: Product, quantity: number): boolean {
  return quantity >= 1 && product.stock >= quantity;
}

export function withStockReducedBy(product: Product, quantity: number): Product {
  if (!hasStockFor(product, quantity)) {
    throw new Error(`Product ${product.id} has ${product.stock} in stock and cannot give ${quantity}`);
  }
  return { ...product, stock: product.stock - quantity };
}

export function withStockRaisedBy(product: Product, quantity: number): Product {
  return { ...product, stock: product.stock + quantity };
}
