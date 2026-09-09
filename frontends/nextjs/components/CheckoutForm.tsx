"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { placeOrder } from "@/server/actions/orderingActions";
import { untouchedAction } from "@/server/actionState";

export function CheckoutForm({
  idempotencyKey,
  disabled,
}: {
  idempotencyKey: string;
  disabled: boolean;
}) {
  const [state, submit] = useActionState(placeOrder, untouchedAction);

  return (
    <form action={submit} className="mt-6">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <SubmitButton
        label="Place order"
        busyLabel="Placing your order"
        disabled={disabled}
      />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
