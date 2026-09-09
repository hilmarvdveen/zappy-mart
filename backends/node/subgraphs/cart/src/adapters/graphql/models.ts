import type { Cart, CartLine } from "../../domain/cart.js";

export type CartModel = Cart;

export type CartLineModel = CartLine & {
  readonly cartId: string;
};

export type ProductReferenceModel = {
  readonly id: string;
};
