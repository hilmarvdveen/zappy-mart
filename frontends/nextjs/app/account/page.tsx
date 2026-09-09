import Link from "next/link";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { OrderSummary } from "@/components/OrderSummary";
import { ProductCard } from "@/components/ProductCard";
import { SessionList } from "@/components/SessionList";
import { SignOutForm } from "@/components/SignOutForm";
import { formatMoment } from "@/formatting/moment";
import { readAccount } from "@/server/account";
import { readOrderHistory } from "@/server/ordering";

export default async function AccountPage() {
  const account = await readAccount();

  if (account === null) {
    return <ApiUnavailableNotice subject="Your account" />;
  }

  const customer = account.me;
  if (customer === null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Your account</h1>
        <p className="mt-4 text-slate-700">
          You are not signed in.{" "}
          <Link href="/sign-in?next=/account" className="underline">
            Sign in to see your orders and sessions
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
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
          </div>
          <SignOutForm />
        </div>
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

      <section aria-labelledby="sessions-heading">
        <h2 id="sessions-heading" className="text-lg font-semibold text-slate-900">
          Sessions
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          Every login of yours that is still open. Revoking one ends it at once,
          on that device.
        </p>
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
