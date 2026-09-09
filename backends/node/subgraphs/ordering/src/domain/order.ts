import type { Money } from "@zappy/shared";
import { addMoney, multiplyMoney, newOrderNumber, subtractMoney, zeroMoney } from "@zappy/shared";

export type OrderStatus = "PLACED" | "PAID" | "CANCELLED";

export type OrderLine = {
  readonly productId: string;
  readonly productName: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly lineTotal: Money;
};

export type Order = {
  readonly id: string;
  readonly sequenceNumber: number;
  readonly number: string;
  readonly customerId: string;
  readonly status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly promotionCode: string | null;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly shipping: Money;
  readonly total: Money;
  readonly placedAt: string;
};

export type OrderableLine = {
  readonly productId: string;
  readonly productName: string;
  readonly unitPrice: Money;
  readonly quantity: number;
};

export type OrderableCart = {
  readonly cartId: string;
  readonly lines: readonly OrderableLine[];
  readonly subtotal: Money;
  readonly promotionCode: string | null;
  readonly discount: Money;
  readonly shipping: Money;
  readonly total: Money;
};

export function orderLinesFrom(cart: OrderableCart): readonly OrderLine[] {
  return cart.lines.map((line) => ({
    productId: line.productId,
    productName: line.productName,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    lineTotal: multiplyMoney(line.unitPrice, line.quantity)
  }));
}

export function subtotalOfLines(lines: readonly OrderLine[]): Money {
  return lines.reduce<Money>((running, line) => addMoney(running, line.lineTotal), zeroMoney);
}

export function placeOrderFrom(
  orderId: string,
  sequenceNumber: number,
  customerId: string,
  cart: OrderableCart,
  placedAt: string
): Order {
  if (cart.lines.length === 0) {
    throw new Error("An order is placed from a cart with at least one line");
  }
  const lines = orderLinesFrom(cart);
  const subtotal = subtotalOfLines(lines);
  return {
    id: orderId,
    sequenceNumber,
    number: newOrderNumber(sequenceNumber),
    customerId,
    status: "PAID",
    lines,
    promotionCode: cart.promotionCode,
    subtotal,
    discount: cart.discount,
    shipping: cart.shipping,
    total: subtractMoney(addMoney(subtotal, cart.shipping), cart.discount),
    placedAt
  };
}
