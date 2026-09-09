import { Client, fetchExchange, type AnyVariables } from "@urql/core";
import type { TypedDocumentNode } from "@urql/core";
import { graphqlUrl, storeFrontOrigin } from "~/environment.server";
import { buildCookieHeader } from "./setCookies";

export const cartCookieName = "zappy_cart";
export const refreshCookieName = "zappy_refresh";

export type StoreCredentials = {
  accessToken: string | null;
  cartCookie: string | null;
  refreshCookie: string | null;
};

export type StoreAnswer<Data> = {
  data: Data | null;
  failureMessage: string | null;
  setCookieHeaders: string[];
};

export const noCredentials: StoreCredentials = {
  accessToken: null,
  cartCookie: null,
  refreshCookie: null,
};

function buildHeaders(credentials: StoreCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/graphql-response+json, application/json",
    Origin: storeFrontOrigin(),
  };
  if (credentials.accessToken !== null) {
    headers.Authorization = `Bearer ${credentials.accessToken}`;
  }
  const cookieHeader = buildCookieHeader({
    [cartCookieName]: credentials.cartCookie,
    [refreshCookieName]: credentials.refreshCookie,
  });
  if (cookieHeader !== null) {
    headers.Cookie = cookieHeader;
  }
  return headers;
}

export async function callStore<Data, Variables extends AnyVariables>(
  document: TypedDocumentNode<Data, Variables>,
  variables: Variables,
  credentials: StoreCredentials,
): Promise<StoreAnswer<Data>> {
  const setCookieHeaders: string[] = [];
  const client = new Client({
    url: graphqlUrl(),
    exchanges: [fetchExchange],
    requestPolicy: "network-only",
    fetchOptions: () => ({ headers: buildHeaders(credentials) }),
    fetch: async (input, options) => {
      const response = await fetch(input, options);
      setCookieHeaders.push(...response.headers.getSetCookie());
      return response;
    },
  });

  const definition = document.definitions[0];
  const isMutation =
    definition !== undefined &&
    definition.kind === "OperationDefinition" &&
    definition.operation === "mutation";

  const result = isMutation
    ? await client.mutation(document, variables).toPromise()
    : await client.query(document, variables).toPromise();

  if (result.error !== undefined) {
    if (result.error.networkError !== undefined) {
      throw new Error(
        `The store front could not reach the Zappy Mart API at ${graphqlUrl()}.`,
        { cause: result.error.networkError },
      );
    }
    return {
      data: result.data ?? null,
      failureMessage: result.error.graphQLErrors
        .map((problem) => problem.message)
        .join(" "),
      setCookieHeaders,
    };
  }

  return {
    data: result.data ?? null,
    failureMessage: null,
    setCookieHeaders,
  };
}
