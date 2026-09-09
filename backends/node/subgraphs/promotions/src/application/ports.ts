import type { Money } from "@zappy/shared";
import type { PromotionCode } from "../domain/promotionCode.js";

export type PromotionCodeRepository = {
  readByCode(code: string): Promise<PromotionCode | null>;
  countOneUse(code: string): Promise<void>;
  replaceAll(codes: readonly PromotionCode[]): Promise<void>;
};

export type AppliedPromotionStore = {
  readByCartIdentifier(cartId: string): Promise<string | null>;
  write(cartId: string, code: string): Promise<void>;
  remove(cartId: string): Promise<void>;
  removeEverything(): Promise<void>;
};

export type CartReference = {
  readonly id: string;
  readonly subtotal: Money;
};

export type CartReader = {
  readCurrentCart(): Promise<CartReference | null>;
};
