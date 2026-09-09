import Link from "next/link";

import { SubmitButton } from "@/components/SubmitButton";
import { signOut } from "@/server/actions/accountActions";
import { readSignedInCustomer } from "@/server/account";
import { countCartItems, readCart } from "@/server/cart";

export async function SiteHeader() {
  const [customer, cart] = await Promise.all([
    readSignedInCustomer(),
    readCart(),
  ]);
  const signedIn = customer?.me != null;
  const savedProductCount = customer?.wishlist.length ?? 0;

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
          <Link
            href="/wishlist"
            className="text-sm text-slate-700 hover:underline"
          >
            Wishlist, {savedProductCount} saved
          </Link>
          <Link href="/cart" className="text-sm text-slate-700 hover:underline">
            Cart, {countCartItems(cart)} {countCartItems(cart) === 1 ? "item" : "items"}
          </Link>
          {signedIn ? (
            <>
              <Link
                href="/account"
                className="text-sm text-slate-700 hover:underline"
              >
                Your account
              </Link>
              <form action={signOut}>
                <SubmitButton
                  label="Log out"
                  busyLabel="Logging out"
                  tone="secondary"
                />
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-slate-700 hover:underline"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
