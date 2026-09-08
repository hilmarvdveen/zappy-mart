import { readFileSync } from "node:fs";
import { ApolloServer, HeaderMap } from "@apollo/server";
import express from "express";
import { GraphQLError, GraphQLScalarType } from "graphql";
import { createStore, formatMoment, loadSeed } from "./state.mjs";
import { catalogueResolvers } from "./catalogue.mjs";
import { cartResolvers } from "./cart.mjs";
import { orderingResolvers } from "./ordering.mjs";
import {
  accountsResolvers,
  hashPassword,
  readVisitorFromAccessToken,
  refreshTokenLifetimeInSeconds
} from "./accounts.mjs";

const contractDirectory = new URL("../../contract/", import.meta.url);

export const graphqlPath = "/graphql";
export const defaultPort = 4000;
export const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3001",
  "http://localhost:4200",
  "http://localhost:4000"
];

const refreshCookieName = "zappy_refresh";
const cartCookieName = "zappy_cart";
const cartCookieLifetimeInSeconds = 30 * 24 * 60 * 60;

const typeDefinitions = [
  readFileSync(new URL("schema.graphql", contractDirectory), "utf8"),
  readFileSync(new URL("schema.development.graphql", contractDirectory), "utf8")
];

const dateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  serialize: (value) => formatMoment(value)
});

const originCheckPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation({ operation, contextValue }) {
        if (operation.operation !== "mutation" || contextValue.originIsAllowed) {
          return;
        }
        throw new GraphQLError(
          "The Origin header is missing or names an origin this server does not allow, so the mutation was refused before it ran.",
          { extensions: { code: "ORIGIN_NOT_ALLOWED", http: { status: 403 } } }
        );
      }
    };
  }
};

export function readCookies(header) {
  const cookies = {};
  if (typeof header !== "string") {
    return cookies;
  }
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    cookies[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim());
  }
  return cookies;
}

export function serialiseCookie(name, value, { path, lifetimeInSeconds }) {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${lifetimeInSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

function readOrigins(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return defaultAllowedOrigins;
  }
  return text
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
}

function buildResolvers(resetSeed) {
  return {
    DateTime: dateTimeScalar,
    Query: {
      ...catalogueResolvers.Query,
      ...cartResolvers.Query,
      ...accountsResolvers.Query,
      ...orderingResolvers.Query
    },
    Mutation: {
      ...cartResolvers.Mutation,
      ...accountsResolvers.Mutation,
      ...orderingResolvers.Mutation,
      resetSeed
    }
  };
}

export async function startMockServer(options = {}) {
  const port = options.port ?? defaultPort;
  const allowedOrigins = options.allowedOrigins ?? defaultAllowedOrigins;

  const store = createStore();
  await loadSeed(store, hashPassword);

  const apolloServer = new ApolloServer({
    includeStacktraceInErrorResponses: false,
    typeDefs: typeDefinitions,
    resolvers: buildResolvers(async (parent, argumentValues, context) => {
      const loadedProducts = await loadSeed(context.store, hashPassword);
      return { success: true, loadedProducts, errors: [] };
    }),
    plugins: [originCheckPlugin]
  });
  await apolloServer.start();

  const application = express();
  application.use(express.json({ limit: "1mb" }));

  application.use((request, response, next) => {
    const origin = request.headers.origin;
    response.setHeader("Vary", "Origin");
    if (typeof origin === "string" && allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (request.method !== "OPTIONS") {
      next();
      return;
    }
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "content-type, authorization, apollo-require-preflight");
    response.setHeader("Access-Control-Max-Age", "600");
    response.status(204).end();
  });

  application.all(graphqlPath, async (request, response) => {
    const cookies = readCookies(request.headers.cookie);
    const cookiesToSet = [];
    const visitor = {
      customerId: null,
      sessionId: null,
      anonymousCartId: cookies[cartCookieName] ?? null
    };

    const context = {
      store,
      now: new Date(),
      visitor,
      refreshToken: cookies[refreshCookieName] ?? null,
      userAgent: request.headers["user-agent"] ?? null,
      originIsAllowed:
        typeof request.headers.origin === "string" && allowedOrigins.includes(request.headers.origin),
      rememberCart(cart) {
        if (cart.customerId !== null) {
          return;
        }
        visitor.anonymousCartId = cart.id;
        if (cart.id !== cookies[cartCookieName]) {
          cookiesToSet.push(
            serialiseCookie(cartCookieName, cart.id, { path: "/", lifetimeInSeconds: cartCookieLifetimeInSeconds })
          );
        }
      },
      clearCartCookie() {
        cookiesToSet.push(serialiseCookie(cartCookieName, "", { path: "/", lifetimeInSeconds: 0 }));
      },
      setRefreshToken(token) {
        cookiesToSet.push(
          serialiseCookie(refreshCookieName, token, {
            path: graphqlPath,
            lifetimeInSeconds: refreshTokenLifetimeInSeconds
          })
        );
      },
      clearRefreshToken() {
        cookiesToSet.push(serialiseCookie(refreshCookieName, "", { path: graphqlPath, lifetimeInSeconds: 0 }));
      }
    };

    const headers = new HeaderMap();
    for (const [name, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    const questionMark = request.originalUrl.indexOf("?");
    const httpGraphQLResponse = await apolloServer.executeHTTPGraphQLRequest({
      httpGraphQLRequest: {
        method: request.method.toUpperCase(),
        headers,
        search: questionMark === -1 ? "" : request.originalUrl.slice(questionMark),
        body: request.method === "POST" ? request.body : undefined
      },
      context: async () => {
        const authorisation = request.headers.authorization ?? "";
        if (authorisation.startsWith("Bearer ")) {
          const claims = await readVisitorFromAccessToken(
            store,
            authorisation.slice("Bearer ".length),
            context.now
          );
          if (claims !== null) {
            visitor.customerId = claims.customerId;
            visitor.sessionId = claims.sessionId;
          }
        }
        return context;
      }
    });

    for (const [name, value] of httpGraphQLResponse.headers) {
      response.setHeader(name, value);
    }
    if (cookiesToSet.length > 0) {
      response.setHeader("Set-Cookie", cookiesToSet);
    }
    response.status(httpGraphQLResponse.status ?? 200);

    if (httpGraphQLResponse.body.kind === "complete") {
      response.send(httpGraphQLResponse.body.string);
      return;
    }
    for await (const chunk of httpGraphQLResponse.body.asyncIterator) {
      response.write(chunk);
    }
    response.end();
  });

  const httpServer = await new Promise((resolve) => {
    const listener = application.listen(port, () => resolve(listener));
  });

  return {
    store,
    port: httpServer.address().port,
    url: `http://localhost:${httpServer.address().port}${graphqlPath}`,
    async stop() {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
        httpServer.closeAllConnections();
      });
      await apolloServer.stop();
    }
  };
}

if (import.meta.main) {
  const { url } = await startMockServer({
    port: Number(process.env.ZAPPY_MOCK_PORT ?? defaultPort),
    allowedOrigins: readOrigins(process.env.ZAPPY_ALLOWED_ORIGINS)
  });
  process.stdout.write(`Zappy Mart mock server is serving ${url}\n`);
}
