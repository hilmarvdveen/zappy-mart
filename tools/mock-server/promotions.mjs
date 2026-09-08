import { userError } from "./state.mjs";

export function normalisePromotionCode(text) {
  return text.trim().toUpperCase();
}

export function findPromotionCode(store, text) {
  const wanted = normalisePromotionCode(text);
  return store.promotionCodes.find((promotionCode) => promotionCode.code === wanted) ?? null;
}

export function isWithinValidityWindow(promotionCode, now) {
  return promotionCode.validFrom.getTime() <= now.getTime() && now.getTime() <= promotionCode.validUntil.getTime();
}

export function hasReachedUsageLimit(promotionCode) {
  return promotionCode.usageLimit !== null && promotionCode.timesUsed >= promotionCode.usageLimit;
}

export function meetsMinimumSubtotal(promotionCode, subtotal) {
  return promotionCode.minimumSubtotal === null || subtotal >= promotionCode.minimumSubtotal.amount;
}

export function givesFreeShipping(promotionCode) {
  return promotionCode.kind === "FREE_SHIPPING";
}

export function calculateDiscount(promotionCode, subtotal) {
  if (promotionCode.kind === "PERCENTAGE") {
    return Math.floor((subtotal * promotionCode.percentage + 50) / 100);
  }
  if (promotionCode.kind === "FIXED_AMOUNT") {
    return Math.min(promotionCode.amount.amount, subtotal);
  }
  return 0;
}

export function checkPromotionCode(store, text, subtotal, now) {
  const promotionCode = findPromotionCode(store, text);
  if (promotionCode === null) {
    return { promotionCode: null, error: userError("CODE_UNKNOWN", "No promotion code with that text exists.", "code") };
  }
  if (!isWithinValidityWindow(promotionCode, now)) {
    return { promotionCode: null, error: userError("CODE_EXPIRED", "This promotion code is outside its validity window.", "code") };
  }
  if (hasReachedUsageLimit(promotionCode)) {
    return { promotionCode: null, error: userError("CODE_EXHAUSTED", "This promotion code has reached its usage limit.", "code") };
  }
  if (!meetsMinimumSubtotal(promotionCode, subtotal)) {
    return {
      promotionCode: null,
      error: userError(
        "CODE_MINIMUM_NOT_MET",
        `This promotion code needs a subtotal of at least ${promotionCode.minimumSubtotal.amount} cents.`,
        "code"
      )
    };
  }
  return { promotionCode, error: null };
}

export function recordPromotionUse(store, code) {
  const promotionCode = findPromotionCode(store, code);
  if (promotionCode !== null) {
    promotionCode.timesUsed += 1;
  }
}
