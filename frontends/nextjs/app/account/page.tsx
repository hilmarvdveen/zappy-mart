import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { OrderSummary } from "@/components/OrderSummary";
import { ProductCard } from "@/components/ProductCard";
import { SessionList } from "@/components/SessionList";
import { formatMoment } from "@/formatting/moment";
import { holdsAccessToken, readAccount } from "@/server/account";
import { readOrderHistory } from "@/server/ordering";

export const metadata: Metadata = {
  title: "Your account",
};

export default async function AccountPage() {
  const account = await readAccount();

  if (account === null) {
    return <ApiUnavailableNotice subject="Your account" />;
  }

  const customer = account.me;
  if (customer === null) {
    if (await holdsAccessToken()) {
      redirect("/login?next=/account&sessionEnded=true");
    }
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Your account</h1>
        <p className="mt-4 text-slate-700">
          You are not logged in.{" "}
          <Link href="/login?next=/account" className="underline">
            Log in to see your orders and sessions
          </Link>
          .
        </p>
      </div>
    );
  }

  const history = await readOrderHistory();
  const orders = history?.orders.edges.map((edge) => edge.node) ?? [];

  return (
    <div className="space-y-10">
      <section aria-labelledby="account-heading">
        <h1
          id="account-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Your account
        </h1>
        <p className="mt-1 text-slate-700">
          {customer.name}, {customer.email}, registered{" "}
          {formatMoment(customer.createdAt)}
        </p>
      </section>

      <section aria-labelledby="order-history-heading">
        <h2
          id="order-history-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Order history
        </h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-slate-700">
            You have not placed an order yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderSummary order={order} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="open-sessions-heading">
        <h2
          id="open-sessions-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Open sessions
        </h2>
        <div className="mt-3">
          <SessionList sessions={customer.sessions} />
        </div>
      </section>

      <section aria-labelledby="account-wishlist-heading">
        <h2
          id="account-wishlist-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Wishlist
        </h2>
        {customer.wishlist.length === 0 ? (
          <p className="mt-2 text-slate-700">Your wishlist is empty.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customer.wishlist.map((product) => (
              <li key={product.id} className="flex">
                <ProductCard product={product} saved />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
