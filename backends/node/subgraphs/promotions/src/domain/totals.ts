import type { Money } from "@zappy/shared";
import { addMoney, money, subtractMoney, zeroMoney } from "@zappy/shared";

export const shippingCharge = money(495);

export const freeShippingThreshold = money(5000);

export function shippingFor(subtotal: Money, freeShippingApplies: boolean): Money {
  if (subtotal.amount === 0) {
    return zeroMoney;
  }
  if (freeShippingApplies) {
    return zeroMoney;
  }
  return subtotal.amount >= freeShippingThreshold.amount ? zeroMoney : shippingCharge;
}

export function totalFor(subtotal: Money, shipping: Money, discount: Money): Money {
  return subtractMoney(addMoney(subtotal, shipping), discount);
}
