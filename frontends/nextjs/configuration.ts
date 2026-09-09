export const graphqlEndpoint =
  process.env.ZAPPY_GRAPHQL_URL ?? "http://localhost:4000/graphql";

export const storefrontOrigin =
  process.env.ZAPPY_STOREFRONT_ORIGIN ?? "http://localhost:3001";

export const sessionSecret =
  process.env.ZAPPY_SESSION_SECRET ??
  "zappy-mart-development-session-secret-not-for-production";

export const runningInProduction = process.env.NODE_ENV === "production";

export const catalogueSize = 24;

export const orderHistorySize = 10;
