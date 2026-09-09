import type { ForwardedHeaders } from "@zappy/shared";
import { askSubgraph, money, zeroMoney } from "@zappy/shared";
import type { OrderableCart, OrderableLine } from "../../domain/order.js";
import type { CartToOrderReader } from "../../application/ports.js";

const currentCartDocument = `
  query CartToOrder {
    cart {
      id
      lines {
        quantity
        product { id }
      }
      subtotal { amount currency }
    }
  }
`;

const productsByReferenceDocument = `
  query ProductsToOrder($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on Product {
        id
        name
        price { amount currency }
      }
    }
  }
`;

const promotionByReferenceDocument = `
  query PromotionToOrder($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on Cart {
        promotion {
          code
          discount { amount currency }
        }
        shipping { amount currency }
        total { amount currency }
      }
    }
  }
`;

type CartAnswer = {
  readonly cart: {
    readonly id: string;
    readonly lines: readonly { readonly quantity: number; readonly product: { readonly id: string } }[];
    readonly subtotal: { readonly amount: number };
  } | null;
};

type ProductsAnswer = {
  readonly _entities: readonly ({
    readonly id: string;
    readonly name: string;
    readonly price: { readonly amount: number };
  } | null)[];
};

type PromotionAnswer = {
  readonly _entities: readonly ({
    readonly promotion: { readonly code: string; readonly discount: { readonly amount: number } } | null;
    readonly shipping: { readonly amount: number };
    readonly total: { readonly amount: number };
  } | null)[];
};

export function graphCartReader(forwarded: ForwardedHeaders): CartToOrderReader {
  return {
    async readOrderableCart(): Promise<OrderableCart | null> {
      const cartAnswer = await askSubgraph<CartAnswer>("cart", currentCartDocument, {}, forwarded);
      const cart = cartAnswer.cart;
      if (cart === null || cart.lines.length === 0) {
        return null;
      }

      const productsAnswer = await askSubgraph<ProductsAnswer>(
        "catalogue",
        productsByReferenceDocument,
        {
          representations: cart.lines.map((line) => ({ __typename: "Product", id: line.product.id }))
        },
        forwarded
      );
      const namedProducts = new Map(
        productsAnswer._entities
          .filter((entity) => entity !== null)
          .map((entity) => [entity.id, entity])
      );

      const lines: OrderableLine[] = cart.lines.map((line) => {
        const product = namedProducts.get(line.product.id);
        return {
          productId: line.product.id,
          productName: product?.name ?? line.product.id,
          unitPrice: money(product?.price.amount ?? 0),
          quantity: line.quantity
        };
      });

      const promotionAnswer = await askSubgraph<PromotionAnswer>(
        "promotions",
        promotionByReferenceDocument,
        {
          representations: [
            {
              __typename: "Cart",
              id: cart.id,
              subtotal: { amount: cart.subtotal.amount, currency: "EUR" }
            }
          ]
        },
        forwarded
      );
      const amounts = promotionAnswer._entities[0] ?? null;

      return {
        cartId: cart.id,
        lines,
        subtotal: money(cart.subtotal.amount),
        promotionCode: amounts?.promotion?.code ?? null,
        discount: amounts === null ? zeroMoney : money(amounts.promotion?.discount.amount ?? 0),
        shipping: amounts === null ? zeroMoney : money(amounts.shipping.amount),
        total: amounts === null ? money(cart.subtotal.amount) : money(amounts.total.amount)
      };
    }
  };
}
