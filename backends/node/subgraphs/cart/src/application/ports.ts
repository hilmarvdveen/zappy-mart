import type { Money } from "@zappy/shared";
import type { Cart } from "../domain/cart.js";

export type CartRepository = {
  readByOwnerKey(ownerKey: string): Promise<Cart | null>;
  readByIdentifier(cartId: string): Promise<Cart | null>;
  write(cart: Cart): Promise<void>;
  moveToOwner(fromOwnerKey: string, toOwnerKey: string): Promise<void>;
  removeEverything(): Promise<void>;
};

export type CataloguedProduct = {
  readonly id: string;
  readonly name: string;
  readonly price: Money;
  readonly stock: number;
};

export type CatalogueReader = {
  readProduct(productId: string): Promise<CataloguedProduct | null>;
  readProducts(productIdentifiers: readonly string[]): Promise<readonly CataloguedProduct[]>;
};
