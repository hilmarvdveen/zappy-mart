import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/login";
import { Messages } from "~/components/Messages";
import { loginMutation } from "~/graphql/documents";
import { describeDevice } from "~/session/deviceDescription";
import { storeConnectionFrom } from "~/session/storeContext";
import { safeReturnTo } from "~/store/returnTo";
import { describeUserErrors } from "~/store/userErrors";

export const meta: Route.MetaFunction = () => [{ title: "Log in | Zappy Mart" }];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), "/account");
  if (connection.signedIn) {
    throw redirect(returnTo);
  }
  return {
    returnTo,
    sessionEnded: url.searchParams.get("reason") === "session-ended",
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const answer = await connection.run(loginMutation, {
    input: {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      device: describeDevice(request.headers.get("User-Agent")),
    },
  });

  const payload = answer.login;
  if (payload.accessToken === null) {
    return { problems: describeUserErrors(payload.errors) };
  }

  connection.rememberAuthentication(payload);
  throw redirect(
    safeReturnTo(String(formData.get("returnTo") ?? ""), "/account"),
  );
}

export default function Login({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Log in</h1>

      {loaderData.sessionEnded ? (
        <Messages
          tone="problem"
          messages={["Your session has ended. Please log in again."]}
        />
      ) : null}
      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <Form method="post" className="space-y-4">
        <input type="hidden" name="returnTo" value={loaderData.returnTo} />

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
            autoComplete="current-password"
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          Log in
        </button>
      </Form>

      <p className="text-sm">
        No account yet?{" "}
        <Link to="/register" className="font-medium text-emerald-700 underline">
          Register
        </Link>
        .
      </p>
    </section>
  );
}
