import type { Order } from "./order.js";

export const orderPlacedEventName = "OrderPlaced";

export type OrderPlaced = {
  readonly name: typeof orderPlacedEventName;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly cartId: string;
  readonly promotionCode: string | null;
  readonly reservedLines: readonly { readonly productId: string; readonly quantity: number }[];
  readonly placedAt: string;
};

export function orderPlaced(order: Order, cartId: string): OrderPlaced {
  return {
    name: orderPlacedEventName,
    orderId: order.id,
    orderNumber: order.number,
    customerId: order.customerId,
    cartId,
    promotionCode: order.promotionCode,
    reservedLines: order.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    placedAt: order.placedAt
  };
}
