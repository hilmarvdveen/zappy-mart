import type { HandledEventStore, Money } from "@zappy/shared";
import type { ManagePromotions, PromotionOutcome } from "./applyPromotionCode.js";

export const promotionUseConsumerName = "promotions.countPromotionUse";

export type PromotionInteractions = {
  validateOnRequest(cartId: string, subtotal: Money, typedCode: string): Promise<PromotionOutcome>;
  countUseOnEvent(eventId: string, typedCode: string): Promise<boolean>;
};

export function promotionInteractions(
  promotions: ManagePromotions,
  handledEvents: HandledEventStore
): PromotionInteractions {
  return {
    async validateOnRequest(cartId, subtotal, typedCode): Promise<PromotionOutcome> {
      return promotions.apply(cartId, subtotal, typedCode);
    },

    async countUseOnEvent(eventId, typedCode): Promise<boolean> {
      let outcome = true;
      await handledEvents.onlyOnce(eventId, promotionUseConsumerName, async () => {
        outcome = await promotions.countUse(typedCode);
      });
      return outcome;
    }
  };
}
