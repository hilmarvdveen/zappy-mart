"use server";

import { redirect } from "next/navigation";

import { placeOrderMutation } from "@/graphql/operations";
import {
  refusedAction,
  unavailableAction,
  type ActionState,
} from "@/server/actionState";
import { revalidateStorefront } from "@/server/revalidation";
import { writeToApi } from "@/server/storefrontClient";

export async function placeOrder(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const idempotencyKey = form.get("idempotencyKey");
  const data = await writeToApi(placeOrderMutation, {
    idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey : null,
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.placeOrder.errors.length > 0) {
    return refusedAction(data.placeOrder.errors);
  }
  const order = data.placeOrder.order;
  if (order === null) {
    return unavailableAction;
  }
  revalidateStorefront();
  redirect(`/orders/${order.id}`);
}
