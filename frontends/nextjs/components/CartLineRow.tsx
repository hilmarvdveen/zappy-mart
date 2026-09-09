"use client";

import { useActionState } from "react";

import { ProductImage } from "@/components/ProductImage";
import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { formatMoney } from "@/formatting/money";
import type { CartDetailFragment } from "@/graphql/generated/graphql";
import {
  changeCartLineQuantity,
  removeCartLine,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

export function CartLineRow({ line }: { line: CartDetailFragment["lines"][number] }) {
  const [quantityState, changeQuantity] = useActionState(
    changeCartLineQuantity,
    untouchedAction,
  );
  const [removalState, remove] = useActionState(
    removeCartLine,
    untouchedAction,
  );
  const quantityFieldId = `line-quantity-${line.id}`;

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-slate-200 py-4">
      <ProductImage imageUrl={line.product.imageUrl} size={64} />
      <div className="min-w-48 flex-1">
        <p className="font-medium text-slate-900">{line.product.name}</p>
        <p className="text-sm text-slate-600">
          {formatMoney(line.product.price)} each
        </p>
      </div>
      <form action={changeQuantity} className="flex items-end gap-2">
        <input type="hidden" name="lineId" value={line.id} />
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
            defaultValue={line.quantity}
            className="mt-1 w-20 rounded border border-slate-400 px-2 py-1 text-sm"
          />
        </div>
        <SubmitButton label="Update" busyLabel="Updating" tone="secondary" />
      </form>
      <p className="w-24 text-right font-medium text-slate-900">
        {formatMoney(line.lineTotal)}
      </p>
      <form action={remove}>
        <input type="hidden" name="lineId" value={line.id} />
        <SubmitButton label="Remove" busyLabel="Removing" tone="secondary" />
      </form>
      <div className="w-full">
        <UserErrorMessages
          errors={quantityState.errors}
          availableStock={quantityState.availableStock}
        />
        <UserErrorMessages errors={removalState.errors} />
      </div>
    </li>
  );
}
