import Link from "next/link";
import { randomUUID } from "node:crypto";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { CartSummary } from "@/components/CartSummary";
import { CheckoutForm } from "@/components/CheckoutForm";
import { formatMoney } from "@/formatting/money";
import { readSignedInCustomer } from "@/server/account";
import { readCart } from "@/server/cart";

export default async function CheckoutPage() {
  const [answer, customer] = await Promise.all([
    readCart(),
    readSignedInCustomer(),
  ]);

  if (answer === null || customer === null) {
    return <ApiUnavailableNotice subject="Your checkout" />;
  }

  const cart = answer.cart;
  const signedIn = customer.me != null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
      <p className="mt-1 text-slate-700">
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
          <p className="mt-2 text-slate-700">
            Your cart is empty.{" "}
            <Link href="/" className="underline">
              Browse the catalogue
            </Link>
            .
          </p>
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

      <div className="mt-6">
        <CartSummary cart={cart} />
      </div>

      {signedIn ? (
        <CheckoutForm
          idempotencyKey={randomUUID()}
          disabled={cart.lines.length === 0}
        />
      ) : (
        <p className="mt-6 text-slate-700">
          An order belongs to an account.{" "}
          <Link href="/sign-in?next=/checkout" className="underline">
            Sign in to place this order
          </Link>
          .
        </p>
      )}
    </div>
  );
}
