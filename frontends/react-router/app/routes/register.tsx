import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/register";
import { Messages } from "~/components/Messages";
import { registerMutation } from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { safeReturnTo } from "~/store/returnTo";
import { describeUserErrors } from "~/store/userErrors";

export const meta: Route.MetaFunction = () => [
  { title: "Register | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), "/account");
  if (connection.signedIn) {
    throw redirect(returnTo);
  }
  return { returnTo };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const answer = await connection.run(registerMutation, {
    input: {
      email: String(formData.get("email") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    },
  });

  const payload = answer.register;
  if (payload.accessToken === null) {
    return { problems: describeUserErrors(payload.errors) };
  }

  connection.rememberAuthentication(payload);
  throw redirect(
    safeReturnTo(String(formData.get("returnTo") ?? ""), "/account"),
  );
}

export default function Register({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Register</h1>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <Form method="post" className="space-y-4">
        <input type="hidden" name="returnTo" value={loaderData.returnTo} />

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            autoComplete="name"
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
          <p className="text-sm text-slate-600">
            At least twelve characters, at most one hundred and twenty eight.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          Register
        </button>
      </Form>

      <p className="text-sm">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-emerald-700 underline">
          Log in
        </Link>
        .
      </p>
    </section>
  );
}
