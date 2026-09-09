import type { Money, UserError } from "@zappy/shared";
import { userError, zeroMoney } from "@zappy/shared";
import type { PromotionCode } from "../domain/promotionCode.js";
import { judgeCode, normaliseCode, ruleOf } from "../domain/promotionCode.js";
import { shippingFor, totalFor } from "../domain/totals.js";
import type { AppliedPromotionStore, PromotionCodeRepository } from "./ports.js";

export type AppliedPromotion = {
  readonly code: string;
  readonly kind: PromotionCode["kind"];
  readonly discount: Money;
};

export type CartAmounts = {
  readonly promotion: AppliedPromotion | null;
  readonly shipping: Money;
  readonly total: Money;
};

export type PromotionOutcome =
  | { readonly kind: "applied"; readonly cartId: string }
  | { readonly kind: "refused"; readonly errors: readonly UserError[] };

export type ManagePromotions = {
  amountsFor(cartId: string, subtotal: Money): Promise<CartAmounts>;
  apply(cartId: string, subtotal: Money, typedCode: string): Promise<PromotionOutcome>;
  remove(cartId: string): Promise<void>;
  countUse(typedCode: string): Promise<boolean>;
};

export function managePromotions(
  codes: PromotionCodeRepository,
  applied: AppliedPromotionStore,
  now: () => Date
): ManagePromotions {
  async function promotionFor(cartId: string, subtotal: Money): Promise<AppliedPromotion | null> {
    const code = await applied.readByCartIdentifier(cartId);
    if (code === null) {
      return null;
    }
    const stored = await codes.readByCode(code);
    if (stored === null) {
      return null;
    }
    const rule = ruleOf(stored);
    return { code: stored.code, kind: stored.kind, discount: rule.discountFor(subtotal) };
  }

  return {
    async amountsFor(cartId, subtotal): Promise<CartAmounts> {
      const promotion = await promotionFor(cartId, subtotal);
      const freeShipping = promotion !== null && promotion.kind === "FREE_SHIPPING";
      const shipping = shippingFor(subtotal, freeShipping);
      return {
        promotion,
        shipping,
        total: totalFor(subtotal, shipping, promotion?.discount ?? zeroMoney)
      };
    },

    async apply(cartId, subtotal, typedCode): Promise<PromotionOutcome> {
      const wanted = normaliseCode(typedCode);
      const stored = await codes.readByCode(wanted);
      if (stored === null) {
        return {
          kind: "refused",
          errors: [userError("CODE_UNKNOWN", `No promotion code reads ${wanted}.`, "code")]
        };
      }
      const verdict = judgeCode(stored, subtotal, now());
      if (verdict !== "usable") {
        return { kind: "refused", errors: [refusalFor(verdict, stored)] };
      }
      await applied.write(cartId, stored.code);
      return { kind: "applied", cartId };
    },

    async remove(cartId): Promise<void> {
      await applied.remove(cartId);
    },

    async countUse(typedCode): Promise<boolean> {
      const wanted = normaliseCode(typedCode);
      const stored = await codes.readByCode(wanted);
      if (stored === null) {
        return false;
      }
      await codes.countOneUse(stored.code);
      return true;
    }
  };
}

function refusalFor(verdict: Exclude<ReturnType<typeof judgeCode>, "usable">, code: PromotionCode): UserError {
  if (verdict === "CODE_EXPIRED") {
    return userError("CODE_EXPIRED", `${code.code} falls outside its validity window today.`, "code");
  }
  if (verdict === "CODE_EXHAUSTED") {
    return userError("CODE_EXHAUSTED", `${code.code} has reached its usage limit.`, "code");
  }
  return userError(
    "CODE_MINIMUM_NOT_MET",
    `${code.code} needs a subtotal of at least ${code.minimumSubtotal?.amount ?? 0} cents.`,
    "code"
  );
}
