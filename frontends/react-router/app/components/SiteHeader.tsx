import { Form, Link, NavLink } from "react-router";

type SiteHeaderProperties = {
  cartQuantity: number;
  customerName: string | null;
  wishlistCount: number;
};

const navigationLink =
  "rounded px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 aria-[current=page]:text-emerald-700";

function Badge({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }
  return (
    <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-semibold text-white">
      {count}
    </span>
  );
}

export function SiteHeader({
  cartQuantity,
  customerName,
  wishlistCount,
}: SiteHeaderProperties) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-emerald-700"
        >
          Zappy Mart
        </Link>
        <nav aria-label="Store" className="flex flex-1 items-center gap-1">
          <NavLink to="/" end className={navigationLink}>
            Catalogue
          </NavLink>
          <NavLink
            to="/wishlist"
            className={navigationLink}
            aria-label={`Wishlist, ${wishlistCount} saved`}
          >
            Wishlist
            <Badge count={wishlistCount} />
          </NavLink>
          <NavLink
            to="/cart"
            className={navigationLink}
            aria-label={`Cart, ${cartQuantity} ${cartQuantity === 1 ? "item" : "items"}`}
          >
            Cart
            <Badge count={cartQuantity} />
          </NavLink>
        </nav>
        {customerName === null ? (
          <Link
            to="/login"
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Log in
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink to="/account" className={navigationLink}>
              {customerName}
            </NavLink>
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log out
              </button>
            </Form>
          </div>
        )}
      </div>
    </header>
  );
}
