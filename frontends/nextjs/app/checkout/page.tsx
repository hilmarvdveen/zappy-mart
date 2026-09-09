import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { CartSummary } from "@/components/CartSummary";
import { CheckoutForm } from "@/components/CheckoutForm";
import { PromotionCodeForm } from "@/components/PromotionCodeForm";
import { formatMoney } from "@/formatting/money";
import { holdsAccessToken, readSignedInCustomer } from "@/server/account";
import { readCart } from "@/server/cart";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  const [answer, signedIn] = await Promise.all([
    readCart(),
    readSignedInCustomer(),
  ]);

  if (answer === null || signedIn === null) {
    return <ApiUnavailableNotice subject="Your checkout" />;
  }

  const customer = signedIn.me;
  if (customer === null) {
    redirect(
      (await holdsAccessToken())
        ? "/login?next=/checkout&sessionEnded=true"
        : "/login?next=/checkout",
    );
  }

  const cart = answer.cart;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
      <p className="mt-1 text-slate-700">
        {customer.name}, check your order and place it.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Payment is simulated. Placing the order reserves the stock and empties
        your cart.
      </p>

      <section aria-labelledby="checkout-cart-heading" className="mt-6">
        <h2
          id="checkout-cart-heading"
          className="text-lg font-semibold text-slate-900"
        >
          What you are ordering
        </h2>
        {cart.lines.length === 0 ? (
          <>
            <p className="mt-2 text-slate-700">Your cart is empty.</p>
            <p className="mt-2">
              <Link href="/" className="underline">
                Browse the catalogue
              </Link>
            </p>
          </>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex justify-between py-2 text-sm">
                <span>
                  {line.quantity} &times; {line.product.name}
                </span>
                <span>{formatMoney(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PromotionCodeForm promotion={cart.promotion} />

      <div className="mt-6">
        <CartSummary cart={cart} />
      </div>

      <CheckoutForm
        idempotencyKey={randomUUID()}
        disabled={cart.lines.length === 0}
      />
    </div>
  );
}
