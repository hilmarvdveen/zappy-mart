"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import {
  applyPromotionCode,
  removePromotionCode,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

export function PromotionCodeForm({
  appliedCode,
}: {
  appliedCode: string | null;
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
      {appliedCode === null ? (
        <form action={apply} className="mt-2 flex items-end gap-2">
          <div>
            <label
              htmlFor="promotion-code"
              className="block text-xs font-medium text-slate-600"
            >
              Code
            </label>
            <input
              id="promotion-code"
              name="code"
              type="text"
              autoComplete="off"
              className="mt-1 w-40 rounded border border-slate-400 px-2 py-1 text-sm uppercase"
            />
          </div>
          <SubmitButton label="Apply" busyLabel="Applying" tone="secondary" />
        </form>
      ) : (
        <form action={removePromotionCode} className="mt-2 flex items-center gap-3">
          <p className="text-sm text-slate-700">
            <span className="font-medium">{appliedCode}</span> is applied.
          </p>
          <SubmitButton label="Remove code" busyLabel="Removing" tone="secondary" />
        </form>
      )}
      <UserErrorMessages errors={applyState.errors} />
    </section>
  );
}
