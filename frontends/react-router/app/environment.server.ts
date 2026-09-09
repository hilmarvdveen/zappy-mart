const developmentSessionSecret = "zappy-mart-development-session-secret";
const defaultGraphqlUrl = "http://localhost:4000/graphql";
const defaultStoreFrontOrigin = "http://localhost:5173";
const defaultAccessTokenMaximumAgeSeconds = 60;

function readSetting(name: string): string | null {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

export function graphqlUrl(): string {
  return readSetting("GRAPHQL_URL") ?? defaultGraphqlUrl;
}

export function storeFrontOrigin(): string {
  return readSetting("STORE_FRONT_ORIGIN") ?? defaultStoreFrontOrigin;
}

export function runningInProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function sessionSecret(): string {
  const configured = readSetting("SESSION_SECRET");
  if (configured !== null) {
    return configured;
  }
  if (runningInProduction()) {
    throw new Error(
      "SESSION_SECRET is missing. It is the key that encrypts the store front session cookie.",
    );
  }
  return developmentSessionSecret;
}

export function accessTokenMaximumAgeSeconds(): number {
  const configured = readSetting("ACCESS_TOKEN_MAXIMUM_AGE_SECONDS");
  if (configured === null) {
    return defaultAccessTokenMaximumAgeSeconds;
  }
  const parsed = Number.parseInt(configured, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return defaultAccessTokenMaximumAgeSeconds;
  }
  return parsed;
}
