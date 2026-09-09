"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { addProductToCart } from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

export function AddToCartForm({
  productId,
  stock,
  withQuantity = false,
}: {
  productId: string;
  stock: number;
  withQuantity?: boolean;
}) {
  const [state, submit] = useActionState(addProductToCart, untouchedAction);
  const soldOut = stock === 0;
  const quantityFieldId = `quantity-${productId}`;

  return (
    <form action={submit} className="mt-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-end gap-2">
        {withQuantity ? (
          <div>
            <label
              htmlFor={quantityFieldId}
              className="block text-xs font-medium text-slate-600"
            >
              Quantity
            </label>
            <input
              id={quantityFieldId}
              name="quantity"
              type="number"
              min={1}
              max={Math.max(stock, 1)}
              defaultValue={1}
              disabled={soldOut}
              className="mt-1 w-20 rounded border border-slate-400 px-2 py-1 text-sm"
            />
          </div>
        ) : (
          <input type="hidden" name="quantity" value="1" />
        )}
        <SubmitButton
          label={soldOut ? "Out of stock" : "Add to cart"}
          busyLabel="Adding"
          disabled={soldOut}
        />
      </div>
      {state.outcome === "succeeded" ? (
        <p role="status" className="mt-2 text-sm text-emerald-700">
          Added to your cart.
        </p>
      ) : null}
      <UserErrorMessages
        errors={state.errors}
        availableStock={state.availableStock}
      />
    </form>
  );
}
