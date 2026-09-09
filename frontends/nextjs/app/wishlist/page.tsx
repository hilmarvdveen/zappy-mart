import type { Metadata } from "next";
import Link from "next/link";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { ProductCard } from "@/components/ProductCard";
import { readSignedInCustomer, readWishlist } from "@/server/account";

export const metadata: Metadata = {
  title: "Your wishlist",
};

export default async function WishlistPage() {
  const [answer, customer] = await Promise.all([
    readWishlist(),
    readSignedInCustomer(),
  ]);

  if (answer === null) {
    return <ApiUnavailableNotice subject="Your wishlist" />;
  }

  const products = answer.wishlist;
  const signedIn = customer?.me != null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Your wishlist</h1>
      {signedIn ? null : (
        <p className="mt-1 text-slate-700">
          This list belongs to your browser until you sign in, and it moves to
          your account when you do.{" "}
          <Link href="/login?next=/wishlist" className="underline">
            Log in to keep it
          </Link>
          .
        </p>
      )}
      {products.length === 0 ? (
        <p className="mt-4 text-slate-700">
          Your wishlist is empty.{" "}
          <Link href="/" className="underline">
            Browse the catalogue
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id} className="flex">
              <ProductCard product={product} saved />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
