import type { SubgraphRequestContext } from "@zappy/shared";
import type { ManagePromotions } from "../../application/applyPromotionCode.js";
import type { PromotionInteractions } from "../../application/promotionInteractions.js";
import type { CartReader } from "../../application/ports.js";

export type PromotionsContext = SubgraphRequestContext & {
  readonly promotions: ManagePromotions;
  readonly interactions: PromotionInteractions;
  readonly carts: CartReader;
  resetOwnData(): Promise<number>;
};
