"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { formatMoney } from "@/formatting/money";
import type { CartDetailFragment } from "@/graphql/generated/graphql";
import {
  applyPromotionCode,
  removePromotionCode,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

function promotionSentence(
  promotion: NonNullable<CartDetailFragment["promotion"]>,
): string {
  if (promotion.kind === "FREE_SHIPPING") {
    return `${promotion.code} makes the shipping free.`;
  }
  return `${promotion.code} takes off ${formatMoney(promotion.discount)}.`;
}

export function PromotionCodeForm({
  promotion,
}: {
  promotion: CartDetailFragment["promotion"];
}) {
  const [applyState, apply] = useActionState(
    applyPromotionCode,
    untouchedAction,
  );

  return (
    <section aria-labelledby="promotion-code-heading" className="mt-6">
      <h2
        id="promotion-code-heading"
        className="text-sm font-semibold text-slate-900"
      >
        Promotion code
      </h2>
      {promotion === null ? (
        <form action={apply} className="mt-2 flex items-end gap-2">
          <div>
            <label
              htmlFor="promotion-code"
              className="block text-xs font-medium text-slate-600"
            >
              Promotion code
            </label>
            <input
              id="promotion-code"
              name="code"
              type="text"
              autoComplete="off"
              className="mt-1 w-44 rounded border border-slate-400 px-2 py-1 text-sm uppercase"
            />
          </div>
          <SubmitButton label="Apply code" busyLabel="Applying" tone="secondary" />
        </form>
      ) : (
        <form action={removePromotionCode} className="mt-2 flex items-center gap-3">
          <p className="text-sm text-slate-700">{promotionSentence(promotion)}</p>
          <SubmitButton label="Remove code" busyLabel="Removing" tone="secondary" />
        </form>
      )}
      <UserErrorMessages errors={applyState.errors} />
    </section>
  );
}
