import type { Money } from "@zappy/shared";
import { money, percentageOfMoney, zeroMoney } from "@zappy/shared";

export type PromotionKind = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export type PromotionRule = {
  readonly kind: PromotionKind;
  readonly makesShippingFree: boolean;
  discountFor(subtotal: Money): Money;
};

export function percentageRule(percentage: number): PromotionRule {
  return {
    kind: "PERCENTAGE",
    makesShippingFree: false,
    discountFor(subtotal: Money): Money {
      return percentageOfMoney(subtotal, percentage);
    }
  };
}

export function fixedAmountRule(amount: Money): PromotionRule {
  return {
    kind: "FIXED_AMOUNT",
    makesShippingFree: false,
    discountFor(subtotal: Money): Money {
      return money(Math.min(amount.amount, subtotal.amount));
    }
  };
}

export const freeShippingRule: PromotionRule = {
  kind: "FREE_SHIPPING",
  makesShippingFree: true,
  discountFor(): Money {
    return zeroMoney;
  }
};
