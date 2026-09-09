import { formatMoney } from "@/formatting/money";
import { formatMoment } from "@/formatting/moment";
import type { OrderDetailFragment } from "@/graphql/generated/graphql";

export function OrderSummary({ order }: { order: OrderDetailFragment }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">
        Order {order.number}
      </h3>
      <p className="text-sm text-slate-600">
        Placed {formatMoment(order.placedAt)}, status {order.status.toLowerCase()}
      </p>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Order lines</caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th scope="col" className="py-1 font-normal">
              Product
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Unit price
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Quantity
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Line total
            </th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.productName} className="border-b border-slate-100">
              <td className="py-1">{line.productName}</td>
              <td className="py-1 text-right">{formatMoney(line.unitPrice)}</td>
              <td className="py-1 text-right">{line.quantity}</td>
              <td className="py-1 text-right">{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="mt-4 w-full max-w-sm text-sm">
        <caption className="text-left text-sm font-semibold text-slate-900">
          Totals
        </caption>
        <tbody>
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Subtotal
            </th>
            <td className="py-1 text-right">{formatMoney(order.subtotal)}</td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Shipping
            </th>
            <td className="py-1 text-right">{formatMoney(order.shipping)}</td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Discount
              {order.promotionCode === null ? "" : `, ${order.promotionCode}`}
            </th>
            <td className="py-1 text-right">{formatMoney(order.discount)}</td>
          </tr>
          <tr className="border-t border-slate-300">
            <th scope="row" className="py-2 text-left font-semibold">
              Total
            </th>
            <td className="py-2 text-right font-semibold">
              {formatMoney(order.total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
