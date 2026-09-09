import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { connectToStore } from "~/session/storeConnection.server";
import { storeConnectionContext } from "~/session/storeContext";
import { loadShell } from "~/store/shell.server";
import "./app.css";

const openStoreConnection: Route.MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const connection = await connectToStore(request);
  context.set(storeConnectionContext, connection);
  const response = await next();
  for (const cookie of (await connection.headers()).getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
};

export const middleware: Route.MiddlewareFunction[] = [openStoreConnection];

export const meta: Route.MetaFunction = () => [
  { title: "Zappy Mart" },
  {
    name: "description",
    content:
      "Zappy Mart, one small web store built on one GraphQL contract, in React Router framework mode.",
  },
];

export async function loader({ context }: Route.LoaderArgs) {
  const connection = context.get(storeConnectionContext);
  if (connection === null) {
    throw new Error("The root middleware did not open a store connection.");
  }
  return loadShell(connection);
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function StoreFront({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <SiteHeader
        cartQuantity={loaderData.cartQuantity}
        customerName={loaderData.customerName}
        wishlistCount={loaderData.wishlistCount}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const heading = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";
  const explanation = isRouteErrorResponse(error)
    ? String(error.data)
    : "The store front could not finish this request.";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">{heading}</h1>
      <p className="mt-2 text-slate-700">{explanation}</p>
      <p className="mt-6">
        <a href="/" className="font-medium text-emerald-700 underline">
          Back to the catalogue
        </a>
      </p>
    </main>
  );
}
