import { RouterContextProvider } from "react-router";
import type { StoreAnswer } from "~/graphql/client.server";
import {
  emptyStoreFrontSession,
  writeStoreFrontSession,
  type StoreFrontSession,
} from "~/session/sessionCookie.server";
import {
  connectToStore,
  type StoreConnection,
} from "~/session/storeConnection.server";
import { storeConnectionContext } from "~/session/storeContext";

export const storeFrontAddress = "http://localhost:5173";

export async function requestWithSession(
  session: Partial<StoreFrontSession>,
  path = "/",
): Promise<Request> {
  const setCookie = await writeStoreFrontSession({
    ...emptyStoreFrontSession,
    ...session,
  });
  return new Request(`${storeFrontAddress}${path}`, {
    headers: { Cookie: setCookie.split(";")[0] ?? "" },
  });
}

export function answerWith<Data>(data: Data): StoreAnswer<Data> {
  return { data, failureMessage: null, setCookieHeaders: [] };
}

export function refusalStatus(refusal: unknown): number | undefined {
  if (refusal instanceof Response) {
    return refusal.status;
  }
  const responseOptions = (refusal as Record<string, unknown>)["init"];
  if (typeof responseOptions !== "object" || responseOptions === null) {
    return undefined;
  }
  const status = (responseOptions as Record<string, unknown>)["status"];
  return typeof status === "number" ? status : undefined;
}

export async function statusOfRefusal(
  attempt: Promise<unknown>,
): Promise<number | undefined> {
  return attempt.then(
    () => undefined,
    (refusal: unknown) => refusalStatus(refusal),
  );
}

export async function openConnectionForTest(options?: {
  signedIn?: boolean;
}): Promise<StoreConnection> {
  const connection = await connectToStore(new Request(`${storeFrontAddress}/`));
  if (options?.signedIn === true) {
    connection.rememberAuthentication({
      customer: { id: "customer-01", name: "Jane Doe" },
      accessToken: "test-access-token",
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  }
  return connection;
}

export function contextFor(connection: StoreConnection): RouterContextProvider {
  const context = new RouterContextProvider();
  context.set(storeConnectionContext, connection);
  return context;
}

export function routeArgumentsFor<Params extends Record<string, string>>(
  connection: StoreConnection,
  request: Request,
  params: Params = {} as Params,
  pattern = "/",
) {
  return {
    request,
    url: new URL(request.url),
    params,
    pattern,
    context: contextFor(connection),
  };
}

export function formRequest(
  path: string,
  fields: Record<string, string | string[]>,
): Request {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        formData.append(name, entry);
      }
    } else {
      formData.append(name, value);
    }
  }
  return new Request(`${storeFrontAddress}${path}`, {
    method: "POST",
    body: formData,
  });
}
