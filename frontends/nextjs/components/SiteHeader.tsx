import Link from "next/link";
import { Suspense } from "react";

import { readSignedInCustomer } from "@/server/account";
import { countCartItems, readCart } from "@/server/cart";

async function HeaderVisitorLinks() {
  const [customer, cart] = await Promise.all([
    readSignedInCustomer(),
    readCart(),
  ]);
  const signedIn = customer?.me != null;

  return (
    <>
      <Link href="/wishlist" className="text-sm text-slate-700 hover:underline">
        Wishlist ({customer?.wishlist.length ?? 0})
      </Link>
      <Link href="/cart" className="text-sm text-slate-700 hover:underline">
        Cart ({countCartItems(cart)})
      </Link>
      {signedIn ? (
        <Link href="/account" className="text-sm text-slate-700 hover:underline">
          Account
        </Link>
      ) : (
        <Link href="/sign-in" className="text-sm text-slate-700 hover:underline">
          Sign in
        </Link>
      )}
    </>
  );
}

function HeaderVisitorLinksPlaceholder() {
  return <span className="text-sm text-slate-400">Loading your basket</span>;
}

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Zappy Mart
        </Link>
        <nav aria-label="Store" className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-700 hover:underline">
            Catalogue
          </Link>
          <Suspense fallback={<HeaderVisitorLinksPlaceholder />}>
            <HeaderVisitorLinks />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
