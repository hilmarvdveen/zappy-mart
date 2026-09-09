"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { formatMoney } from "@/formatting/money";
import type { CartDetailFragment } from "@/graphql/generated/graphql";
import {
  changeCartLineQuantity,
  removeCartLine,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

export function CartLineRow({
  line,
}: {
  line: CartDetailFragment["lines"][number];
}) {
  const [quantityState, changeQuantity] = useActionState(
    changeCartLineQuantity,
    untouchedAction,
  );
  const [removalState, remove] = useActionState(removeCartLine, untouchedAction);
  const quantityFieldId = `line-quantity-${line.id}`;

  return (
    <tr className="border-b border-slate-200 align-top">
      <th scope="row" className="py-4 text-left font-medium text-slate-900">
        {line.product.name}
        <span className="block text-sm font-normal text-slate-600">
          {formatMoney(line.product.price)} each
        </span>
      </th>
      <td className="py-4">
        <form action={changeQuantity} className="flex items-center gap-2">
          <input type="hidden" name="lineId" value={line.id} />
          <label htmlFor={quantityFieldId} className="sr-only">
            Quantity of {line.product.name}
          </label>
          <input
            id={quantityFieldId}
            name="quantity"
            type="number"
            min={1}
            defaultValue={line.quantity}
            className="w-20 rounded border border-slate-400 px-2 py-1 text-sm"
          />
          <SubmitButton label="Update" busyLabel="Updating" tone="secondary" />
        </form>
        <UserErrorMessages
          errors={quantityState.errors}
          availableStock={quantityState.availableStock}
        />
      </td>
      <td className="py-4 text-right font-medium text-slate-900">
        {formatMoney(line.lineTotal)}
      </td>
      <td className="py-4 text-right">
        <form action={remove}>
          <input type="hidden" name="lineId" value={line.id} />
          <SubmitButton
            label={`Remove ${line.product.name}`}
            busyLabel="Removing"
            tone="secondary"
          />
        </form>
        <UserErrorMessages errors={removalState.errors} />
      </td>
    </tr>
  );
}
