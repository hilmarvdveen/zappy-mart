import { data, Link } from "react-router";
import type { Route } from "./+types/orderConfirmation";
import { orderQuery } from "~/graphql/documents";
import { requireCustomer } from "~/session/storeConnection.server";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `Order ${loaderData?.order.number ?? ""} | Zappy Mart` },
];

export async function loader({ url, params, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const answer = await connection.run(orderQuery, { id: params.orderId });
  if (answer.order === null) {
    throw data("That order does not belong to this account.", { status: 404 });
  }
  return { order: answer.order };
}

export default function OrderConfirmation({
  loaderData,
}: Route.ComponentProps) {
  const { order } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Thank you for your order</h1>
      <p className="text-slate-700">
        Order {order.number} is {order.status.toLowerCase()}. It was placed on{" "}
        {new Date(order.placedAt).toISOString().slice(0, 10)}.
      </p>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">The lines of this order</caption>
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th scope="col" className="py-2 pr-4">
              Product
            </th>
            <th scope="col" className="py-2 pr-4">
              Unit price
            </th>
            <th scope="col" className="py-2 pr-4">
              Quantity
            </th>
            <th scope="col" className="py-2">
              Line total
            </th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr
              key={`${line.productName}-${line.quantity}`}
              className="border-b border-slate-200"
            >
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                {line.productName}
              </th>
              <td className="py-3 pr-4">{formatMoney(line.unitPrice)}</td>
              <td className="py-3 pr-4">{line.quantity}</td>
              <td className="py-3">{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section
        aria-labelledby="order-totals-heading"
        className="max-w-sm space-y-2 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 id="order-totals-heading" className="text-lg font-semibold">
          Totals
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{formatMoney(order.shipping)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Discount</dt>
            <dd>{formatMoney(order.discount)}</dd>
          </div>
          {order.promotionCode === null ? null : (
            <div className="flex justify-between">
              <dt>Promotion code</dt>
              <dd>{order.promotionCode}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
        </dl>
      </section>

      <p className="flex gap-4 text-sm">
        <Link to="/account" className="font-medium text-emerald-700 underline">
          Your orders
        </Link>
        <Link to="/" className="font-medium text-emerald-700 underline">
          Back to the catalogue
        </Link>
      </p>
    </section>
  );
}
