import { randomUUID } from "node:crypto";
import { data, Form, Link, redirect } from "react-router";
import type { Route } from "./+types/checkout";
import { Messages } from "~/components/Messages";
import {
  applyPromotionCodeMutation,
  cartQuery,
  placeOrderMutation,
  removePromotionCodeMutation,
} from "~/graphql/documents";
import { requireCustomer } from "~/session/storeConnection.server";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const applyPromotionCodeIntent = "applyPromotionCode";
const removePromotionCodeIntent = "removePromotionCode";
const placeOrderIntent = "placeOrder";

export const meta: Route.MetaFunction = () => [
  { title: "Checkout | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const answer = await connection.run(cartQuery, {});
  if (answer.cart.lines.length === 0) {
    throw redirect("/cart");
  }
  return {
    cart: answer.cart,
    customerName: connection.customerName,
    idempotencyKey: randomUUID(),
  };
}

export async function action({ request, url, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === applyPromotionCodeIntent) {
    const answer = await connection.run(applyPromotionCodeMutation, {
      code: String(formData.get("promotionCode") ?? "").trim(),
    });
    return { problems: describeUserErrors(answer.applyPromotionCode.errors) };
  }

  if (intent === removePromotionCodeIntent) {
    const answer = await connection.run(removePromotionCodeMutation, {});
    return { problems: describeUserErrors(answer.removePromotionCode.errors) };
  }

  if (intent !== placeOrderIntent) {
    throw data(`Checkout does not know the action ${intent}.`, { status: 400 });
  }

  const answer = await connection.run(placeOrderMutation, {
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  const order = answer.placeOrder.order;
  if (order === null) {
    return { problems: describeUserErrors(answer.placeOrder.errors) };
  }
  throw redirect(`/orders/${order.id}`);
}

export default function Checkout({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { cart, customerName, idempotencyKey } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="text-slate-700">
        {customerName === null
          ? "Check your order and place it."
          : `${customerName}, check your order and place it.`}
      </p>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">The lines you are about to order</caption>
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th scope="col" className="py-2 pr-4">
              Product
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
          {cart.lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-200">
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                {line.product.name}
              </th>
              <td className="py-3 pr-4">{line.quantity}</td>
              <td className="py-3">{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          aria-labelledby="checkout-promotion-heading"
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2
            id="checkout-promotion-heading"
            className="text-lg font-semibold"
          >
            Promotion code
          </h2>
          {cart.promotion === null ? null : (
            <p className="text-sm text-slate-700">
              {cart.promotion.code} takes off{" "}
              {formatMoney(cart.promotion.discount)}.
            </p>
          )}
          <Form method="post" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="checkout-promotion-code"
                className="text-sm font-medium"
              >
                Promotion code
              </label>
              <input
                id="checkout-promotion-code"
                type="text"
                name="promotionCode"
                defaultValue=""
                className="w-48 rounded border border-slate-400 px-3 py-1.5"
              />
            </div>
            <button
              type="submit"
              name="intent"
              value={applyPromotionCodeIntent}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Apply code
            </button>
            {cart.promotion === null ? null : (
              <button
                type="submit"
                name="intent"
                value={removePromotionCodeIntent}
                className="rounded border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Remove code
              </button>
            )}
          </Form>
        </section>

        <section
          aria-labelledby="checkout-totals-heading"
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 id="checkout-totals-heading" className="text-lg font-semibold">
            Totals
          </h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{formatMoney(cart.shipping)}</dd>
            </div>
            {cart.promotion === null ? null : (
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd>{formatMoney(cart.promotion.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(cart.total)}</dd>
            </div>
          </dl>
          <Form method="post">
            <input
              type="hidden"
              name="idempotencyKey"
              value={idempotencyKey}
            />
            <button
              type="submit"
              name="intent"
              value={placeOrderIntent}
              className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
            >
              Place order
            </button>
          </Form>
          <p className="text-sm">
            <Link to="/cart" className="font-medium text-emerald-700 underline">
              Back to the cart
            </Link>
          </p>
        </section>
      </div>
    </section>
  );
}
