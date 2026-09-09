import { cache } from "react";

import type { CartContentsQuery } from "@/graphql/generated/graphql";
import { cartQuery } from "@/graphql/operations";
import { readFromApi } from "@/server/storefrontClient";

export const readCart = cache(
  async (): Promise<CartContentsQuery | null> => readFromApi(cartQuery, {}),
);

export function countCartItems(cart: CartContentsQuery | null): number {
  if (cart === null) {
    return 0;
  }
  return cart.cart.lines.reduce((total, line) => total + line.quantity, 0);
}
