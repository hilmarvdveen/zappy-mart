import type { AnyVariables, TypedDocumentNode } from "@urql/core";
import { data, redirect } from "react-router";
import { accessTokenMaximumAgeSeconds } from "~/environment.server";
import {
  callStore,
  cartCookieName,
  refreshCookieName,
  type StoreCredentials,
} from "~/graphql/client.server";
import { logoutMutation, refreshSessionMutation } from "~/graphql/documents";
import { readCookieChanges } from "~/graphql/setCookies";
import {
  clearStoreFrontSession,
  emptyStoreFrontSession,
  readStoreFrontSession,
  writeStoreFrontSession,
  type StoreFrontSession,
} from "./sessionCookie.server";

const renewalMarginMilliseconds = 30_000;

const documentsThatCarryTheRefreshCookie: readonly unknown[] = [
  refreshSessionMutation,
  logoutMutation,
];

export type AuthenticationOutcome = {
  customer: { id: string; name: string } | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
};

export type StoreConnection = {
  readonly signedIn: boolean;
  readonly customerName: string | null;
  readonly sessionEnded: boolean;
  run<Data, Variables extends AnyVariables>(
    document: TypedDocumentNode<Data, Variables>,
    variables: Variables,
  ): Promise<Data>;
  rememberAuthentication(outcome: AuthenticationOutcome): void;
  endSession(): void;
  headers(extra?: HeadersInit): Promise<Headers>;
};

export async function connectToStore(
  request: Request,
): Promise<StoreConnection> {
  let session = await readStoreFrontSession(request);
  let sessionChanged = false;
  let sessionCleared = false;
  let sessionEnded = false;

  function credentials(document: unknown): StoreCredentials {
    return {
      accessToken: session.accessToken,
      cartCookie: session.cartCookie,
      refreshCookie: documentsThatCarryTheRefreshCookie.includes(document)
        ? session.refreshCookie
        : null,
    };
  }

  function absorbCookies(setCookieHeaders: string[]): void {
    const changes = readCookieChanges(setCookieHeaders);
    for (const name of [cartCookieName, refreshCookieName]) {
      if (!changes.has(name)) {
        continue;
      }
      const value = changes.get(name) ?? null;
      session =
        name === cartCookieName
          ? { ...session, cartCookie: value }
          : { ...session, refreshCookie: value };
      sessionChanged = true;
    }
  }

  function accessTokenNeedsRenewal(): boolean {
    if (session.accessToken === null || session.accessTokenObtainedAt === null) {
      return true;
    }
    const obtainedAt = Date.parse(session.accessTokenObtainedAt);
    if (Number.isNaN(obtainedAt)) {
      return true;
    }
    if (Date.now() - obtainedAt >= accessTokenMaximumAgeSeconds() * 1000) {
      return true;
    }
    if (session.accessTokenExpiresAt === null) {
      return false;
    }
    const expiresAt = Date.parse(session.accessTokenExpiresAt);
    return (
      !Number.isNaN(expiresAt) &&
      expiresAt - Date.now() <= renewalMarginMilliseconds
    );
  }

  function rememberAuthentication(outcome: AuthenticationOutcome): void {
    session = {
      ...session,
      accessToken: outcome.accessToken,
      accessTokenExpiresAt: outcome.accessTokenExpiresAt,
      accessTokenObtainedAt: new Date().toISOString(),
      customerName: outcome.customer?.name ?? session.customerName,
    };
    sessionChanged = true;
  }

  function forgetCustomer(): void {
    const keptSession: StoreFrontSession = {
      ...emptyStoreFrontSession,
      cartCookie: session.cartCookie,
    };
    session = keptSession;
    sessionChanged = true;
    sessionEnded = true;
  }

  async function renewAccessToken(): Promise<void> {
    const answer = await callStore(
      refreshSessionMutation,
      {},
      credentials(refreshSessionMutation),
    );
    absorbCookies(answer.setCookieHeaders);
    const payload = answer.data?.refreshSession ?? null;
    if (payload === null || payload.accessToken === null) {
      forgetCustomer();
      return;
    }
    rememberAuthentication(payload);
  }

  async function run<Data, Variables extends AnyVariables>(
    document: TypedDocumentNode<Data, Variables>,
    variables: Variables,
  ): Promise<Data> {
    const answer = await callStore(document, variables, credentials(document));
    absorbCookies(answer.setCookieHeaders);
    if (answer.data === null) {
      throw data(
        answer.failureMessage ?? "The Zappy Mart API answered nothing.",
        { status: 502 },
      );
    }
    return answer.data;
  }

  if (session.refreshCookie !== null && accessTokenNeedsRenewal()) {
    await renewAccessToken();
  }

  return {
    get signedIn() {
      return session.accessToken !== null;
    },
    get customerName() {
      return session.customerName;
    },
    get sessionEnded() {
      return sessionEnded;
    },
    run,
    rememberAuthentication,
    endSession() {
      session = emptyStoreFrontSession;
      sessionChanged = true;
      sessionCleared = true;
    },
    async headers(extra?: HeadersInit) {
      const built = new Headers(extra);
      if (sessionCleared) {
        built.append("Set-Cookie", await clearStoreFrontSession());
      } else if (sessionChanged) {
        built.append("Set-Cookie", await writeStoreFrontSession(session));
      }
      return built;
    },
  };
}

export function requireCustomer(
  connection: StoreConnection,
  address: URL,
): void {
  if (connection.signedIn) {
    return;
  }
  const parameters = new URLSearchParams({
    returnTo: `${address.pathname}${address.search}`,
  });
  if (connection.sessionEnded) {
    parameters.set("reason", "session-ended");
  }
  throw redirect(`/login?${parameters.toString()}`);
}
