"use server";

import {
  addToCartMutation,
  applyPromotionCodeMutation,
  changeCartLineQuantityMutation,
  removeCartLineMutation,
  removePromotionCodeMutation,
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

function readWholeNumber(form: FormData, field: string, fallback: number) {
  const parsed = Number.parseInt(readText(form, field), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function addProductToCart(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(addToCartMutation, {
    productId: readText(form, "productId"),
    quantity: readWholeNumber(form, "quantity", 1),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.addToCart.errors.length > 0) {
    return refusedAction(data.addToCart.errors, data.addToCart.availableStock);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function changeCartLineQuantity(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(changeCartLineQuantityMutation, {
    lineId: readText(form, "lineId"),
    quantity: readWholeNumber(form, "quantity", 1),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.changeCartLineQuantity.errors.length > 0) {
    return refusedAction(
      data.changeCartLineQuantity.errors,
      data.changeCartLineQuantity.availableStock,
    );
  }
  revalidateStorefront();
  return succeededAction;
}

export async function removeCartLine(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(removeCartLineMutation, {
    lineId: readText(form, "lineId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.removeCartLine.errors.length > 0) {
    return refusedAction(data.removeCartLine.errors);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function applyPromotionCode(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(applyPromotionCodeMutation, {
    code: readText(form, "code").trim(),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.applyPromotionCode.errors.length > 0) {
    return refusedAction(data.applyPromotionCode.errors);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function removePromotionCode(): Promise<void> {
  await writeToApi(removePromotionCodeMutation, {});
  revalidateStorefront();
}
