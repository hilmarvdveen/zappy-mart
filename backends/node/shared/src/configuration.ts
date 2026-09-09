export type SubgraphName = "catalogue" | "cart" | "promotions" | "ordering" | "accounts";

export const subgraphNames: readonly SubgraphName[] = [
  "catalogue",
  "cart",
  "promotions",
  "ordering",
  "accounts"
];

export const gatewayPort = 4100;

export const subgraphPorts: Readonly<Record<SubgraphName, number>> = {
  catalogue: 4101,
  cart: 4102,
  promotions: 4103,
  ordering: 4104,
  accounts: 4105
};

export const frontendOrigins: readonly string[] = [
  "http://localhost:5173",
  "http://localhost:3001",
  "http://localhost:4200"
];

export function allowedOrigins(): readonly string[] {
  const configured = process.env["ZAPPY_ALLOWED_ORIGINS"];
  if (configured === undefined || configured.trim().length === 0) {
    return frontendOrigins;
  }
  return configured.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0);
}

export type Profile = "development" | "production";

export function currentProfile(): Profile {
  return process.env["ZAPPY_PROFILE"] === "production" ? "production" : "development";
}

export function subgraphUrl(name: SubgraphName): string {
  const configured = process.env[`ZAPPY_${name.toUpperCase()}_URL`];
  return configured ?? `http://localhost:${subgraphPorts[name]}/graphql`;
}

export function jsonWebKeySetUrl(): string {
  const configured = process.env["ZAPPY_JWKS_URL"];
  return configured ?? `http://localhost:${subgraphPorts.accounts}/.well-known/jwks.json`;
}

export function portFor(name: SubgraphName): number {
  const configured = process.env[`ZAPPY_${name.toUpperCase()}_PORT`];
  return configured === undefined ? subgraphPorts[name] : Number(configured);
}

export const defaultSubgraphRequestTimeoutInMilliseconds = 5000;

export function subgraphRequestTimeoutInMilliseconds(): number {
  const configured = process.env["ZAPPY_SUBGRAPH_TIMEOUT_MILLISECONDS"];
  return configured === undefined ? defaultSubgraphRequestTimeoutInMilliseconds : Number(configured);
}

export const accessTokenLifetimeInSeconds = 15 * 60;

export const refreshTokenLifetimeInDays = 30;

export const tokenIssuer = "zappy-mart-accounts";

export const tokenAudience = "zappy-mart-graph";

export const refreshCookieName = "zappy_refresh";

export const cartCookieName = "zappy_cart";

export const refreshCookiePath = "/graphql";
