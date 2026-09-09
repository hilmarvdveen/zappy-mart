import { data, Form, Link, useFetcher } from "react-router";
import type { Route } from "./+types/cart";
import { Messages } from "~/components/Messages";
import {
  applyPromotionCodeMutation,
  cartQuery,
  changeCartLineQuantityMutation,
  removeCartLineMutation,
  removePromotionCodeMutation,
  type Cart,
} from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const changeQuantityIntent = "changeQuantity";
const removeLineIntent = "removeLine";
const applyPromotionCodeIntent = "applyPromotionCode";
const removePromotionCodeIntent = "removePromotionCode";

type CartLine = Cart["lines"][number];

export const meta: Route.MetaFunction = () => [{ title: "Cart | Zappy Mart" }];

export async function loader({ context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const answer = await connection.run(cartQuery, {});
  return { cart: answer.cart };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === changeQuantityIntent) {
    const quantity = Number.parseInt(
      String(formData.get("quantity") ?? "1"),
      10,
    );
    const answer = await connection.run(changeCartLineQuantityMutation, {
      lineId: String(formData.get("lineId") ?? ""),
      quantity: Number.isNaN(quantity) ? 1 : quantity,
    });
    return {
      problems: describeUserErrors(answer.changeCartLineQuantity.errors),
      availableStock: answer.changeCartLineQuantity.availableStock,
    };
  }

  if (intent === removeLineIntent) {
    const answer = await connection.run(removeCartLineMutation, {
      lineId: String(formData.get("lineId") ?? ""),
    });
    return {
      problems: describeUserErrors(answer.removeCartLine.errors),
      availableStock: null,
    };
  }

  if (intent === applyPromotionCodeIntent) {
    const answer = await connection.run(applyPromotionCodeMutation, {
      code: String(formData.get("promotionCode") ?? "").trim(),
    });
    return {
      problems: describeUserErrors(answer.applyPromotionCode.errors),
      availableStock: null,
    };
  }

  if (intent === removePromotionCodeIntent) {
    const answer = await connection.run(removePromotionCodeMutation, {});
    return {
      problems: describeUserErrors(answer.removePromotionCode.errors),
      availableStock: null,
    };
  }

  throw data(`The cart does not know the action ${intent}.`, { status: 400 });
}

function CartLineRow({ line }: { line: CartLine }) {
  const fetcher = useFetcher();
  const pendingIntent = fetcher.formData?.get("intent");
  if (pendingIntent === removeLineIntent) {
    return null;
  }

  const pendingQuantity = fetcher.formData?.get("quantity");
  const parsedQuantity =
    typeof pendingQuantity === "string"
      ? Number.parseInt(pendingQuantity, 10)
      : Number.NaN;
  const quantity = Number.isNaN(parsedQuantity)
    ? line.quantity
    : parsedQuantity;
  const lineTotal =
    quantity === line.quantity
      ? line.lineTotal
      : {
          amount: line.product.price.amount * quantity,
          currency: line.product.price.currency,
        };

  return (
    <tr className="border-b border-slate-200">
      <th scope="row" className="py-3 pr-4 text-left font-medium">
        <Link
          to={`/products/${line.product.slug}`}
          className="text-emerald-700 underline"
        >
          {line.product.name}
        </Link>
      </th>
      <td className="py-3 pr-4">{formatMoney(line.product.price)}</td>
      <td className="py-3 pr-4">
        <fetcher.Form method="post" className="flex items-center gap-2">
          <input type="hidden" name="lineId" value={line.id} />
          <label htmlFor={`quantity-${line.id}`} className="sr-only">
            Quantity of {line.product.name}
          </label>
          <input
            id={`quantity-${line.id}`}
            type="number"
            name="quantity"
            min={1}
            defaultValue={quantity}
            key={quantity}
            className="w-20 rounded border border-slate-400 px-2 py-1"
          />
          <button
            type="submit"
            name="intent"
            value={changeQuantityIntent}
            className="rounded border border-slate-400 px-3 py-1 text-sm font-medium hover:bg-slate-100"
          >
            Update
          </button>
        </fetcher.Form>
      </td>
      <td className="py-3 pr-4 font-medium">{formatMoney(lineTotal)}</td>
      <td className="py-3">
        <fetcher.Form method="post">
          <input type="hidden" name="lineId" value={line.id} />
          <button
            type="submit"
            name="intent"
            value={removeLineIntent}
            className="rounded border border-slate-400 px-3 py-1 text-sm font-medium hover:bg-slate-100"
          >
            Remove {line.product.name}
          </button>
        </fetcher.Form>
      </td>
    </tr>
  );
}

export default function CartPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { cart } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Cart</h1>

      <Messages tone="problem" messages={actionData?.problems ?? []} />
      {actionData?.availableStock === null ||
      actionData?.availableStock === undefined ? null : (
        <p className="text-sm text-slate-700">
          {actionData.availableStock} left in stock.
        </p>
      )}

      {cart.lines.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6">
          Your cart is empty.{" "}
          <Link to="/" className="font-medium text-emerald-700 underline">
            Find something in the catalogue
          </Link>
          .
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">The lines in your cart</caption>
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th scope="col" className="py-2 pr-4">
                  Product
                </th>
                <th scope="col" className="py-2 pr-4">
                  Price
                </th>
                <th scope="col" className="py-2 pr-4">
                  Quantity
                </th>
                <th scope="col" className="py-2 pr-4">
                  Line total
                </th>
                <th scope="col" className="py-2">
                  Remove
                </th>
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((line) => (
                <CartLineRow key={line.id} line={line} />
              ))}
            </tbody>
          </table>

          <div className="grid gap-6 md:grid-cols-2">
            <section
              aria-labelledby="promotion-heading"
              className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 id="promotion-heading" className="text-lg font-semibold">
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
                    htmlFor="promotion-code"
                    className="text-sm font-medium"
                  >
                    Promotion code
                  </label>
                  <input
                    id="promotion-code"
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
              aria-labelledby="totals-heading"
              className="space-y-2 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 id="totals-heading" className="text-lg font-semibold">
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
              <Link
                to="/checkout"
                className="inline-block rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
              >
                Go to checkout
              </Link>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
