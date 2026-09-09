import type { Money } from "@zappy/shared";
import { isAtLeast, money } from "@zappy/shared";
import type { PromotionKind, PromotionRule } from "./promotionRule.js";
import { fixedAmountRule, freeShippingRule, percentageRule } from "./promotionRule.js";

export type PromotionCode = {
  readonly code: string;
  readonly kind: PromotionKind;
  readonly percentage: number | null;
  readonly amount: Money | null;
  readonly minimumSubtotal: Money | null;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly usageLimit: number | null;
  readonly timesUsed: number;
};

export type CodeVerdict = "usable" | "CODE_EXPIRED" | "CODE_EXHAUSTED" | "CODE_MINIMUM_NOT_MET";

export function normaliseCode(typed: string): string {
  return typed.trim().toUpperCase();
}

export function ruleOf(code: PromotionCode): PromotionRule {
  if (code.kind === "PERCENTAGE") {
    return percentageRule(code.percentage ?? 0);
  }
  if (code.kind === "FIXED_AMOUNT") {
    return fixedAmountRule(code.amount ?? money(0));
  }
  return freeShippingRule;
}

export function judgeCode(code: PromotionCode, subtotal: Money, moment: Date): CodeVerdict {
  const from = new Date(code.validFrom).getTime();
  const until = new Date(code.validUntil).getTime();
  const now = moment.getTime();
  if (now < from || now > until) {
    return "CODE_EXPIRED";
  }
  if (code.usageLimit !== null && code.timesUsed >= code.usageLimit) {
    return "CODE_EXHAUSTED";
  }
  if (code.minimumSubtotal !== null && !isAtLeast(subtotal, code.minimumSubtotal)) {
    return "CODE_MINIMUM_NOT_MET";
  }
  return "usable";
}
