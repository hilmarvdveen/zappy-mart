import type { ForwardedHeaders } from "@zappy/shared";
import { askSubgraph, money } from "@zappy/shared";
import type { CartReader, CartReference } from "../../application/ports.js";

const currentCartDocument = `
  query CurrentCart {
    cart {
      id
      subtotal { amount currency }
    }
  }
`;

type CartAnswer = {
  readonly cart: { readonly id: string; readonly subtotal: { readonly amount: number } } | null;
};

export function currentCartReader(forwarded: ForwardedHeaders): CartReader {
  return {
    async readCurrentCart(): Promise<CartReference | null> {
      const answer = await askSubgraph<CartAnswer>("cart", currentCartDocument, {}, forwarded, {
        idempotent: true
      });
      if (answer.cart === null) {
        return null;
      }
      return { id: answer.cart.id, subtotal: money(answer.cart.subtotal.amount) };
    }
  };
}
