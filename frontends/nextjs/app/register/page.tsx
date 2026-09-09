import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/RegisterForm";
import { readSignedInCustomer } from "@/server/account";

function safeDestination(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single !== undefined && single.startsWith("/") ? single : "/account";
}

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const parameters = await searchParams;
  const destination = safeDestination(parameters.next);
  const customer = await readSignedInCustomer();

  if (customer?.me != null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Register</h1>
        <p className="mt-4 text-slate-700">
          You already have an account and you are logged in as{" "}
          {customer.me.name}.{" "}
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
      <h1 className="text-2xl font-semibold text-slate-900">Register</h1>
      <p className="mt-2 text-slate-700">
        An account keeps your orders, your sessions and your wishlist. The cart
        and the wishlist you filled while logged out move with you.
      </p>
      <div className="mt-6">
        <RegisterForm destination={destination} />
      </div>
      <p className="mt-6 text-sm text-slate-700">
        Already registered?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
        .
      </p>
    </div>
  );
}
