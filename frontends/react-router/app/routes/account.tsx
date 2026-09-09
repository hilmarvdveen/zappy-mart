import { data, Form, Link, redirect } from "react-router";
import type { Route } from "./+types/account";
import { Messages } from "~/components/Messages";
import { accountQuery, revokeSessionMutation } from "~/graphql/documents";
import { requireCustomer } from "~/session/storeConnection.server";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const revokeSessionIntent = "revokeSession";
const orderHistorySize = 10;

export const meta: Route.MetaFunction = () => [
  { title: "Account | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const answer = await connection.run(accountQuery, {
    first: orderHistorySize,
  });
  if (answer.me === null) {
    throw redirect("/login?reason=session-ended");
  }
  return {
    customer: answer.me,
    orders: answer.orders.edges.map((edge) => edge.node),
    orderCount: answer.orders.totalCount,
  };
}

export async function action({ request, url, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent !== revokeSessionIntent) {
    throw data(`The account does not know the action ${intent}.`, {
      status: 400,
    });
  }

  const answer = await connection.run(revokeSessionMutation, {
    sessionId: String(formData.get("sessionId") ?? ""),
  });
  const problems = describeUserErrors(answer.revokeSession.errors);
  if (problems.length > 0) {
    return { problems };
  }

  const stillHoldingThisDevice = answer.revokeSession.sessions.some(
    (session) => session.current,
  );
  if (!stillHoldingThisDevice) {
    connection.endSession();
    throw redirect("/login?reason=session-ended");
  }
  return { problems: [] };
}

export default function Account({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { customer, orders, orderCount } = loaderData;

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Your account</h1>
        <p className="text-slate-700">
          {customer.name}, {customer.email}
        </p>
      </section>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <section aria-labelledby="order-history-heading" className="space-y-4">
        <h2 id="order-history-heading" className="text-xl font-semibold">
          Order history
        </h2>
        {orders.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6">
            You have not placed an order yet.{" "}
            <Link to="/" className="font-medium text-emerald-700 underline">
              Find something in the catalogue
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {orderCount} orders in total.
            </p>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">The orders you placed</caption>
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th scope="col" className="py-2 pr-4">
                    Order
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Placed on
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Status
                  </th>
                  <th scope="col" className="py-2">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-200">
                    <th scope="row" className="py-3 pr-4 text-left font-medium">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-emerald-700 underline"
                      >
                        {order.number}
                      </Link>
                    </th>
                    <td className="py-3 pr-4">
                      {new Date(order.placedAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 pr-4">{order.status}</td>
                    <td className="py-3">{formatMoney(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section aria-labelledby="sessions-heading" className="space-y-4">
        <h2 id="sessions-heading" className="text-xl font-semibold">
          Open sessions
        </h2>
        <p className="text-sm text-slate-600">
          Every login opens a session. Revoke one and that browser has to log in
          again.
        </p>
        <ul className="space-y-3">
          {customer.sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">
                  {session.device}
                  {session.current ? " (this device)" : ""}
                </p>
                <p className="text-sm text-slate-600">
                  Opened {new Date(session.createdAt).toISOString().slice(0, 10)}
                  , last used{" "}
                  {new Date(session.lastUsedAt).toISOString().slice(0, 10)}
                </p>
              </div>
              <Form method="post">
                <input type="hidden" name="sessionId" value={session.id} />
                <button
                  type="submit"
                  name="intent"
                  value={revokeSessionIntent}
                  className="rounded border border-slate-400 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                >
                  Revoke {session.device}
                </button>
              </Form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
