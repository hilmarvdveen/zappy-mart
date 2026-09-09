import { formatMoney } from "@/formatting/money";
import type { CartDetailFragment } from "@/graphql/generated/graphql";

export function CartSummary({ cart }: { cart: CartDetailFragment }) {
  return (
    <table className="w-full max-w-sm text-sm">
      <caption className="text-left text-sm font-semibold text-slate-900">
        Totals
      </caption>
      <tbody>
        <tr>
          <th scope="row" className="py-1 text-left font-normal text-slate-600">
            Subtotal
          </th>
          <td className="py-1 text-right">{formatMoney(cart.subtotal)}</td>
        </tr>
        <tr>
          <th scope="row" className="py-1 text-left font-normal text-slate-600">
            Shipping
          </th>
          <td className="py-1 text-right">{formatMoney(cart.shipping)}</td>
        </tr>
        {cart.promotion === null ? null : (
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Discount, {cart.promotion.code}
            </th>
            <td className="py-1 text-right">
              {formatMoney(cart.promotion.discount)}
            </td>
          </tr>
        )}
        <tr className="border-t border-slate-300">
          <th scope="row" className="py-2 text-left font-semibold">
            Total
          </th>
          <td className="py-2 text-right font-semibold">
            {formatMoney(cart.total)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
