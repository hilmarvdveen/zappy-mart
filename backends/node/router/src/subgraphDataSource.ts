import { RemoteGraphQLDataSource } from "@apollo/gateway";
import {
  subgraphRequestTimeoutInMilliseconds,
  traceHeadersOfActiveContext,
  type SubgraphName
} from "@zappy/shared";
import type { GatewayContext } from "./gatewayContext.js";

const forwardedRequestHeaders = ["authorization", "cookie"] as const;

export function subgraphDataSource(name: SubgraphName, url: string): RemoteGraphQLDataSource<GatewayContext> {
  return new RemoteGraphQLDataSource<GatewayContext>({
    url,

    fetcher: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(subgraphRequestTimeoutInMilliseconds()) }),

    willSendRequest({ request, context }) {
      for (const header of forwardedRequestHeaders) {
        const value = context.incomingHeaders[header];
        if (value !== undefined) {
          request.http?.headers.set(header, value);
        }
      }
      const origin = context.incomingHeaders["origin"];
      if (origin !== undefined) {
        request.http?.headers.set("origin", origin);
      }
      for (const [header, value] of Object.entries(traceHeadersOfActiveContext())) {
        request.http?.headers.set(header, value);
      }
      request.http?.headers.set("x-zappy-subgraph", name);
    },

    didReceiveResponse({ response, context }) {
      for (const [header, value] of response.http?.headers ?? []) {
        if (header.toLowerCase() === "set-cookie") {
          context.collectCookie(value);
        }
      }
      return response;
    }
  });
}
