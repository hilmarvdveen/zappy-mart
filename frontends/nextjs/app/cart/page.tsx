import type { Metadata } from "next";
import Link from "next/link";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { CartLineRow } from "@/components/CartLineRow";
import { CartSummary } from "@/components/CartSummary";
import { readCart } from "@/server/cart";

export const metadata: Metadata = {
  title: "Cart",
};

export default async function CartPage() {
  const answer = await readCart();

  if (answer === null) {
    return <ApiUnavailableNotice subject="Your cart" />;
  }

  const cart = answer.cart;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Cart</h1>
      {cart.lines.length === 0 ? (
        <>
          <p className="mt-4 text-slate-700">Your cart is empty.</p>
          <p className="mt-2">
            <Link href="/" className="underline">
              Browse the catalogue
            </Link>
          </p>
        </>
      ) : (
        <>
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">The lines in your cart</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-600">
                <th scope="col" className="py-2 font-normal">
                  Product
                </th>
                <th scope="col" className="py-2 font-normal">
                  Quantity
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Line total
                </th>
                <th scope="col" className="py-2 text-right font-normal">
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
          <div className="mt-6">
            <CartSummary cart={cart} />
          </div>
          <Link
            href="/checkout"
            className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Go to checkout
          </Link>
        </>
      )}
    </div>
  );
}
