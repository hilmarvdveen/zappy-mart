"use server";

import {
  addToWishlistMutation,
  removeFromWishlistMutation,
} from "@/graphql/operations";
import {
  refusedAction,
  succeededAction,
  unavailableAction,
  type ActionState,
} from "@/server/actionState";
import { revalidateStorefront } from "@/server/revalidation";
import { writeToApi } from "@/server/storefrontClient";

function readText(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
}

export async function saveProductToWishlist(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(addToWishlistMutation, {
    productId: readText(form, "productId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.addToWishlist.errors.length > 0) {
    return refusedAction(data.addToWishlist.errors);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function removeProductFromWishlist(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(removeFromWishlistMutation, {
    productId: readText(form, "productId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.removeFromWishlist.errors.length > 0) {
    return refusedAction(data.removeFromWishlist.errors);
  }
  revalidateStorefront();
  return succeededAction;
}
