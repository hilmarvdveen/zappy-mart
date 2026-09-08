import { randomUUID } from "node:crypto";
import { money, userError } from "./state.mjs";
import { createPage, findProductById } from "./catalogue.mjs";
import { calculateAmounts, emptyCart, openCartForVisitor } from "./cart.mjs";
import { recordPromotionUse } from "./promotions.mjs";

export const defaultOrderPageSize = 10;
const firstOrderNumber = 100001;

export function placeOrderFromCart(store, cart, customerId, now) {
  if (cart.lines.length === 0) {
    return { order: null, errors: [userError("CART_EMPTY", "The cart has no lines, so there is nothing to order.")] };
  }

  for (const line of cart.lines) {
    const product = findProductById(store, line.productId);
    if (product.stock < line.quantity) {
      return {
        order: null,
        errors: [
          userError(
            "OUT_OF_STOCK",
            `Only ${product.stock} of ${product.name} are available, which is fewer than the ${line.quantity} on the cart, so no order was placed.`
          )
        ]
      };
    }
  }

  const amounts = calculateAmounts(store, cart);
  const orderLines = cart.lines.map((line) => {
    const product = findProductById(store, line.productId);
    return {
      productName: product.name,
      unitPrice: money(product.price.amount),
      quantity: line.quantity,
      lineTotal: money(product.price.amount * line.quantity)
    };
  });

  for (const line of cart.lines) {
    findProductById(store, line.productId).stock -= line.quantity;
  }

  const order = {
    id: `order-${randomUUID()}`,
    number: `ZM-${firstOrderNumber + store.orderNumberSequence}`,
    customerId,
    status: "PAID",
    lines: orderLines,
    promotionCode: amounts.promotionCode === null ? null : amounts.promotionCode.code,
    subtotal: money(amounts.subtotal),
    discount: money(amounts.discount),
    shipping: money(amounts.shipping),
    total: money(amounts.total),
    placedAt: now
  };
  store.orderNumberSequence += 1;
  store.orders.push(order);

  if (amounts.promotionCode !== null) {
    recordPromotionUse(store, amounts.promotionCode.code);
  }
  emptyCart(cart, now);

  return { order, errors: [] };
}

export function ordersOfCustomer(store, customerId) {
  return store.orders.filter((order) => order.customerId === customerId).slice().reverse();
}

export const orderingResolvers = {
  Query: {
    orders(parent, { first, after }, context) {
      const owned = context.visitor.customerId === null ? [] : ordersOfCustomer(context.store, context.visitor.customerId);
      return createPage(owned, {
        first,
        defaultSize: defaultOrderPageSize,
        after,
        cursorPrefix: "order",
        present: (order) => order
      });
    },

    order(parent, { id }, context) {
      if (context.visitor.customerId === null) {
        return null;
      }
      return (
        context.store.orders.find(
          (order) => order.id === id && order.customerId === context.visitor.customerId
        ) ?? null
      );
    }
  },

  Mutation: {
    placeOrder(parent, argumentValues, context) {
      if (context.visitor.customerId === null) {
        return {
          order: null,
          errors: [userError("NOT_AUTHENTICATED", "Placing an order needs a signed in customer.")]
        };
      }
      const cart = openCartForVisitor(context.store, context.visitor, context.now);
      return placeOrderFromCart(context.store, cart, context.visitor.customerId, context.now);
    }
  }
};
