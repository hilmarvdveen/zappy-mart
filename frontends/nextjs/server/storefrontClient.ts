import "server-only";

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import type { OperationVariables, TypedDocumentNode } from "@apollo/client";

import { graphqlEndpoint, storefrontOrigin } from "@/configuration";
import {
  buildApiCookieHeader,
  readApiCookieUpdate,
  type ApiCookieUpdate,
} from "@/server/apiCookies";
import {
  persistApiCookies,
  readApiCookies,
  readSession,
} from "@/server/session";
import type { StorefrontSession } from "@/server/sessionCipher";

export type StorefrontClient = {
  apollo: ApolloClient;
  receivedApiCookies: ApiCookieUpdate;
  session: StorefrontSession;
};

export async function createStorefrontClient(): Promise<StorefrontClient> {
  const session = await readSession();
  const apiCookies = await readApiCookies();
  const receivedApiCookies: ApiCookieUpdate = {};

  const fetchThroughSession: typeof fetch = async (target, options) => {
    const headers = new Headers(options?.headers);
    headers.set("origin", storefrontOrigin);
    if (session.accessToken !== null) {
      headers.set("authorization", `Bearer ${session.accessToken}`);
    }
    const cookieHeader = buildApiCookieHeader(apiCookies);
    if (cookieHeader !== null) {
      headers.set("cookie", cookieHeader);
    }
    const response = await fetch(target, {
      ...options,
      headers,
      cache: "no-store",
    });
    Object.assign(
      receivedApiCookies,
      readApiCookieUpdate(response.headers.getSetCookie()),
    );
    return response;
  };

  const apollo = new ApolloClient({
    link: new HttpLink({
      uri: graphqlEndpoint,
      fetch: fetchThroughSession,
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: { fetchPolicy: "no-cache" },
      mutate: { fetchPolicy: "no-cache" },
    },
  });

  return { apollo, receivedApiCookies, session };
}

function reportApiFailure(operationName: string, failure: unknown): void {
  console.error(`The Zappy Mart API refused ${operationName}`, failure);
}

export async function readFromApi<TData, TVariables extends OperationVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
): Promise<TData | null> {
  const client = await createStorefrontClient();
  try {
    const result = await client.apollo.query({ query: document, variables });
    return result.data ?? null;
  } catch (failure) {
    reportApiFailure("a read", failure);
    return null;
  }
}

export async function writeToApi<TData, TVariables extends OperationVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
): Promise<TData | null> {
  const client = await createStorefrontClient();
  try {
    const result = await client.apollo.mutate({
      mutation: document,
      variables,
    });
    await persistApiCookies(client.receivedApiCookies);
    return result.data ?? null;
  } catch (failure) {
    reportApiFailure("a write", failure);
    return null;
  }
}
