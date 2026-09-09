import Link from "next/link";

import { RegisterForm } from "@/components/RegisterForm";
import { SignInForm } from "@/components/SignInForm";
import { readSignedInCustomer } from "@/server/account";

function safeDestination(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single !== undefined && single.startsWith("/") ? single : "/account";
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const parameters = await searchParams;
  const destination = safeDestination(parameters.next);
  const customer = await readSignedInCustomer();

  if (customer?.me != null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-4 text-slate-700">
          You are signed in as {customer.me.name}.{" "}
          <Link href="/account" className="underline">
            Go to your account
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1 text-slate-700">
        The seeded customer is jane@example.com with the password
        &quot;correct horse battery staple&quot;. Products you saved while
        signed out move to your account when you sign in.
      </p>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="sign-in-heading">
          <h2
            id="sign-in-heading"
            className="text-lg font-semibold text-slate-900"
          >
            With an account
          </h2>
          <div className="mt-3">
            <SignInForm destination={destination} />
          </div>
        </section>
        <section aria-labelledby="register-heading">
          <h2
            id="register-heading"
            className="text-lg font-semibold text-slate-900"
          >
            New here
          </h2>
          <div className="mt-3">
            <RegisterForm destination={destination} />
          </div>
        </section>
      </div>
    </div>
  );
}
