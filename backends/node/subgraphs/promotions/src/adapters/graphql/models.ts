import type { Money } from "@zappy/shared";

export type CartReferenceModel = {
  readonly id: string;
  readonly subtotal: Money;
};
