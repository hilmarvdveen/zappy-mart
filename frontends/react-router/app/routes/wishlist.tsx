import { Form, Link } from "react-router";
import type { Route } from "./+types/wishlist";
import { Messages } from "~/components/Messages";
import { ProductCard } from "~/components/ProductCard";
import {
  removeFromWishlistMutation,
  wishlistQuery,
} from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { describeUserErrors } from "~/store/userErrors";

export const meta: Route.MetaFunction = () => [
  { title: "Wishlist | Zappy Mart" },
];

export async function loader({ context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const answer = await connection.run(wishlistQuery, {});
  return { signedIn: connection.signedIn, products: answer.wishlist };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const answer = await connection.run(removeFromWishlistMutation, {
    productId: String(formData.get("productId") ?? ""),
  });
  return { problems: describeUserErrors(answer.removeFromWishlist.errors) };
}

export default function Wishlist({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { signedIn, products } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Wishlist</h1>
      <p className="text-slate-700">
        {signedIn
          ? "Your wishlist lives on your account and follows you to every browser."
          : "Your wishlist travels with this browser. It moves to your account when you log in."}
      </p>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      {products.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6">
          Nothing on your wishlist yet.{" "}
          <Link to="/" className="font-medium text-emerald-700 underline">
            Find something in the catalogue
          </Link>
          .
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id} className="space-y-2">
              <ProductCard product={product} />
              <Form method="post">
                <input type="hidden" name="productId" value={product.id} />
                <button
                  type="submit"
                  className="w-full rounded border border-slate-400 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                >
                  Remove {product.name}
                </button>
              </Form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
