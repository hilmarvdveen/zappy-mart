import { data, Form, Link } from "react-router";
import type { Route } from "./+types/product";
import { Messages } from "~/components/Messages";
import { ProductImage } from "~/components/ProductImage";
import {
  addToCartMutation,
  addToWishlistMutation,
  productPageQuery,
} from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const addToCartIntent = "addToCart";
const saveToWishlistIntent = "saveToWishlist";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.product.name ?? "Product"} | Zappy Mart` },
];

export async function loader({ params, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const answer = await connection.run(productPageQuery, {
    slug: params.slug,
  });
  if (answer.product === null) {
    throw data(`No product has the slug ${params.slug}.`, { status: 404 });
  }
  return { product: answer.product };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const productId = String(formData.get("productId") ?? "");

  if (intent === saveToWishlistIntent) {
    const answer = await connection.run(addToWishlistMutation, { productId });
    const problems = describeUserErrors(answer.addToWishlist.errors);
    return {
      problems,
      confirmations: problems.length === 0 ? ["Saved to your wishlist."] : [],
      availableStock: null,
    };
  }

  if (intent !== addToCartIntent) {
    throw data(`The product page does not know the action ${intent}.`, {
      status: 400,
    });
  }

  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
  const answer = await connection.run(addToCartMutation, {
    productId,
    quantity: Number.isNaN(quantity) ? 1 : quantity,
  });
  const problems = describeUserErrors(answer.addToCart.errors);
  return {
    problems,
    confirmations: problems.length === 0 ? ["Added to your cart."] : [],
    availableStock: answer.addToCart.availableStock,
  };
}

export default function ProductPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { product } = loaderData;
  const outOfStock = product.stock === 0;

  return (
    <article className="space-y-6">
      <p className="text-sm">
        <Link to="/" className="font-medium text-emerald-700 underline">
          Back to the catalogue
        </Link>
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <ProductImage
          name={product.name}
          className="w-full rounded-lg border border-slate-200 bg-white"
        />

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {product.category.name}
          </p>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">{formatMoney(product.price)}</p>
          <p className="text-slate-700">{product.description}</p>
          <p className="text-sm text-slate-600">
            {outOfStock ? "Out of stock" : `${product.stock} in stock`}
          </p>

          <Messages tone="problem" messages={actionData?.problems ?? []} />
          <Messages
            tone="confirmation"
            messages={actionData?.confirmations ?? []}
          />
          {actionData?.availableStock === null ||
          actionData?.availableStock === undefined ? null : (
            <p className="text-sm text-slate-700">
              {actionData.availableStock} left in stock.
            </p>
          )}

          <Form method="post" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <div className="flex flex-col gap-1">
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                name="quantity"
                min={1}
                defaultValue={1}
                className="w-24 rounded border border-slate-400 px-3 py-1.5"
              />
            </div>
            <button
              type="submit"
              name="intent"
              value={addToCartIntent}
              disabled={outOfStock}
              className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add to cart
            </button>
          </Form>

          <Form method="post">
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              name="intent"
              value={saveToWishlistIntent}
              className="rounded border border-slate-400 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
            >
              Save to wishlist
            </button>
          </Form>
        </div>
      </div>
    </article>
  );
}
