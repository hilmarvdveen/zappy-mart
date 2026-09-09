import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/SignInForm";
import { readSignedInCustomer } from "@/server/account";

function safeDestination(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single !== undefined && single.startsWith("/") ? single : "/account";
}

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LogInPage({ searchParams }: PageProps<"/login">) {
  const parameters = await searchParams;
  const destination = safeDestination(parameters.next);
  const sessionEnded = parameters.sessionEnded !== undefined;
  const customer = await readSignedInCustomer();

  if (customer?.me != null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-4 text-slate-700">
          You are logged in as {customer.me.name}.{" "}
          <Link href="/account" className="underline">
            Go to your account
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
      {sessionEnded ? (
        <p
          role="alert"
          className="mt-4 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Your session has ended. Please log in again.
        </p>
      ) : null}
      <p className="mt-2 text-slate-700">
        The seeded customer is jane@example.com with the password
        &quot;correct horse battery staple&quot;.
      </p>
      <div className="mt-6">
        <SignInForm destination={destination} />
      </div>
      <p className="mt-6 text-sm text-slate-700">
        No account yet?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
        .
      </p>
    </div>
  );
}
