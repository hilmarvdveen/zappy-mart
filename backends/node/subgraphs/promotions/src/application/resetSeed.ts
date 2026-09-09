import { money, readSeedPromotionCodes } from "@zappy/shared";
import type { PromotionCode } from "../domain/promotionCode.js";
import type { AppliedPromotionStore, PromotionCodeRepository } from "./ports.js";

export function seededPromotionCodes(): readonly PromotionCode[] {
  return readSeedPromotionCodes().map((code) => ({
    code: code.code,
    kind: code.kind,
    percentage: code.percentage,
    amount: code.amount === null ? null : money(code.amount.amount),
    minimumSubtotal: code.minimumSubtotal === null ? null : money(code.minimumSubtotal.amount),
    validFrom: code.validFrom,
    validUntil: code.validUntil,
    usageLimit: code.usageLimit,
    timesUsed: code.timesUsed
  }));
}

export function resetPromotionSeed(
  codes: PromotionCodeRepository,
  applied: AppliedPromotionStore
): () => Promise<number> {
  return async (): Promise<number> => {
    const seeded = seededPromotionCodes();
    await applied.removeEverything();
    await codes.replaceAll(seeded);
    return seeded.length;
  };
}
