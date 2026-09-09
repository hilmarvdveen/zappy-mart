import Link from "next/link";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { CartLineRow } from "@/components/CartLineRow";
import { CartSummary } from "@/components/CartSummary";
import { PromotionCodeForm } from "@/components/PromotionCodeForm";
import { readCart } from "@/server/cart";

export default async function CartPage() {
  const answer = await readCart();

  if (answer === null) {
    return <ApiUnavailableNotice subject="Your cart" />;
  }

  const cart = answer.cart;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Your cart</h1>
      {cart.lines.length === 0 ? (
        <p className="mt-4 text-slate-700">
          Your cart is empty.{" "}
          <Link href="/" className="underline">
            Browse the catalogue
          </Link>
          .
        </p>
      ) : (
        <>
          <ul className="mt-4">
            {cart.lines.map((line) => (
              <CartLineRow key={line.id} line={line} />
            ))}
          </ul>
          <PromotionCodeForm appliedCode={cart.promotion?.code ?? null} />
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
