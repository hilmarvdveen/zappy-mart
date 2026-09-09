import type { Money } from "@zappy/shared";
import { addMoney, money, multiplyMoney, zeroMoney } from "@zappy/shared";

export type CartLine = {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
};

export type Cart = {
  readonly id: string;
  readonly ownerKey: string;
  readonly lines: readonly CartLine[];
  readonly updatedAt: string;
};

export type PricedLine = CartLine & {
  readonly unitPrice: Money;
  readonly lineTotal: Money;
};

export function emptyCart(id: string, ownerKey: string, updatedAt: string): Cart {
  return { id, ownerKey, lines: [], updatedAt };
}

export function lineForProduct(cart: Cart, productId: string): CartLine | null {
  return cart.lines.find((line) => line.productId === productId) ?? null;
}

export function lineById(cart: Cart, lineId: string): CartLine | null {
  return cart.lines.find((line) => line.id === lineId) ?? null;
}

export function quantityAfterAdding(cart: Cart, productId: string, quantity: number): number {
  const existing = lineForProduct(cart, productId);
  return (existing?.quantity ?? 0) + quantity;
}

export function withProductAdded(
  cart: Cart,
  newLineId: string,
  productId: string,
  quantity: number,
  updatedAt: string
): Cart {
  const existing = lineForProduct(cart, productId);
  if (existing === null) {
    return {
      ...cart,
      lines: [...cart.lines, { id: newLineId, productId, quantity }],
      updatedAt
    };
  }
  return withLineQuantityChanged(cart, existing.id, existing.quantity + quantity, updatedAt);
}

export function withLineQuantityChanged(
  cart: Cart,
  lineId: string,
  quantity: number,
  updatedAt: string
): Cart {
  return {
    ...cart,
    lines: cart.lines.map((line) => (line.id === lineId ? { ...line, quantity } : line)),
    updatedAt
  };
}

export function withLineRemoved(cart: Cart, lineId: string, updatedAt: string): Cart {
  return { ...cart, lines: cart.lines.filter((line) => line.id !== lineId), updatedAt };
}

export function withEveryLineRemoved(cart: Cart, updatedAt: string): Cart {
  return { ...cart, lines: [], updatedAt };
}

export function isQuantityValid(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1;
}

export function priceLines(
  cart: Cart,
  unitPriceOf: (productId: string) => Money | null
): readonly PricedLine[] {
  return cart.lines.map((line) => {
    const unitPrice = unitPriceOf(line.productId) ?? money(0);
    return { ...line, unitPrice, lineTotal: multiplyMoney(unitPrice, line.quantity) };
  });
}

export function subtotalOf(pricedLines: readonly PricedLine[]): Money {
  return pricedLines.reduce<Money>((running, line) => addMoney(running, line.lineTotal), zeroMoney);
}
