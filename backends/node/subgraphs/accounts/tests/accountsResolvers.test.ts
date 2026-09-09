import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import { fixedClock, openInMemoryDatabase, systemClock } from "@zappy/shared";
import { anonymousContext, buildTestSchema, runOperation, signedInContext } from "@zappy/shared/testing";
import { createAccountTables } from "../src/adapters/persistence/accountTables.js";
import {
  sqlCustomerRepository,
  sqlRefreshTokenRepository,
  sqlSessionRepository,
  sqlWishlistRepository
} from "../src/adapters/persistence/sqlAccountRepositories.js";
import { generateSigningKeys, jsonWebKeySet, rsaTokenIssuer } from "../src/adapters/security/rsaTokenIssuer.js";
import { authenticate } from "../src/application/authenticate.js";
import { inMemoryAttemptLimiter } from "../src/application/attemptLimiter.js";
import { manageSessions } from "../src/application/manageSessions.js";
import { manageWishlist } from "../src/application/manageWishlist.js";
import { resetAccountSeed } from "../src/application/resetSeed.js";
import type { CartMerger, PasswordHasher } from "../src/application/ports.js";
import { accountsResolvers } from "../src/adapters/graphql/resolvers.js";
import type { AccountsContext } from "../src/adapters/graphql/context.js";

const readablePasswordHasher: PasswordHasher = {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  },
  async verify(passwordHash: string, password: string): Promise<boolean> {
    return passwordHash === `hashed:${password}`;
  }
};

let database: Database;
let context: AccountsContext;
let mergedCarts: string[];
let writtenCookies: string[];
const schema = buildTestSchema<AccountsContext>("accounts", accountsResolvers);

const cartMerger: CartMerger = {
  async moveAnonymousCart(visitorKey: string, customerId: string): Promise<void> {
    mergedCarts.push(`${visitorKey}:${customerId}`);
  }
};

async function contextFor(overrides: Partial<AccountsContext> = {}): Promise<AccountsContext> {
  const customers = sqlCustomerRepository(database);
  const sessionStore = sqlSessionRepository(database);
  const refreshTokens = sqlRefreshTokenRepository(database);
  const wishlists = sqlWishlistRepository(database);
  const keys = await generateSigningKeys();
  const tokens = rsaTokenIssuer(keys, () => systemClock.now());
  let visitorKey: string | null = null;
  let sessionOfThisRequest: string | null = null;
  return {
    ...anonymousContext({
      setCookie(value: string): void {
        writtenCookies.push(value);
      }
    }),
    customers,
    sessions: manageSessions(sessionStore, refreshTokens, () => systemClock.now()),
    wishlist: manageWishlist(wishlists, () => systemClock.now()),
    accounts: authenticate(
      customers,
      sessionStore,
      refreshTokens,
      wishlists,
      readablePasswordHasher,
      tokens,
      cartMerger,
      inMemoryAttemptLimiter(),
      () => systemClock.now()
    ),
    callerKey: "127.0.0.1",
    wishlistOwner() {
      return { customerId: null, visitorKey };
    },
    rememberVisitor(): string {
      visitorKey = visitorKey ?? "visitor-one";
      return visitorKey;
    },
    currentSessionId(): string | null {
      return sessionOfThisRequest;
    },
    rememberCurrentSession(sessionId: string): void {
      sessionOfThisRequest = sessionId;
    },
    async resetOwnData(): Promise<void> {
      await resetAccountSeed(customers, sessionStore, wishlists, readablePasswordHasher)();
    },
    ...overrides
  };
}

before(async () => {
  database = openInMemoryDatabase();
  await createAccountTables(database);
});

beforeEach(async () => {
  mergedCarts = [];
  writtenCookies = [];
  context = await contextFor();
  await context.resetOwnData();
});

after(async () => {
  await database.close();
});

const authenticationFields = `
  customer { id email name }
  accessToken
  accessTokenExpiresAt
  errors { code field }
`;

describe("the accounts subgraph", () => {
  it("registers a customer, normalises the address and sets the refresh cookie", async () => {
    const answer = await runOperation(
      schema,
      `mutation Register($input: RegisterInput!) { register(input: $input) { ${authenticationFields} } }`,
      { input: { email: "New.Person@Example.com", name: "New Person", password: "correct horse battery" } },
      context
    );
    const payload = answer.data?.["register"] as {
      customer: { email: string };
      accessToken: string;
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.customer.email, "new.person@example.com");
    assert.match(payload.accessToken, /^ey/);
    assert.equal(writtenCookies.length, 1);
    assert.match(writtenCookies[0] ?? "", /^zappy_refresh=/);
    assert.match(writtenCookies[0] ?? "", /HttpOnly/);
    assert.match(writtenCookies[0] ?? "", /SameSite=Lax/);
  });

  it("refuses an address that is taken, one that is not an address, and a password outside the range", async () => {
    for (const [input, expected] of [
      [
        { email: "jane@example.com", name: "Jane", password: "correct horse battery" },
        "EMAIL_TAKEN"
      ],
      [{ email: "not an address", name: "Jane", password: "correct horse battery" }, "EMAIL_INVALID"],
      [{ email: "short@example.com", name: "Jane", password: "too short" }, "PASSWORD_TOO_SHORT"],
      [
        { email: "long@example.com", name: "Jane", password: "a".repeat(129) },
        "PASSWORD_TOO_LONG"
      ]
    ] as const) {
      const answer = await runOperation(
        schema,
        `mutation Register($input: RegisterInput!) { register(input: $input) { ${authenticationFields} } }`,
        { input },
        context
      );
      const payload = answer.data?.["register"] as { errors: readonly { code: string }[] };
      assert.equal(payload.errors[0]?.code, expected);
    }
  });

  it("logs the seeded customer in and lists the session as the current one", async () => {
    const answer = await runOperation(
      schema,
      `mutation Login($input: LoginInput!) { login(input: $input) { ${authenticationFields} } }`,
      {
        input: {
          email: "Jane@Example.com",
          password: "correct horse battery staple",
          device: "Chrome on Windows"
        }
      },
      context
    );
    const payload = answer.data?.["login"] as {
      customer: { id: string };
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.customer.id, "customer-01");

    const signedIn = await contextFor();
    const sessions = await signedIn.sessions.openSessionsFor("customer-01");
    const listed = await runOperation(
      schema,
      "{ me { email sessions { device current } } }",
      {},
      {
        ...signedIn,
        ...signedInContext("customer-01", sessions[0]?.id ?? ""),
        currentSessionId: () => sessions[0]?.id ?? null
      }
    );
    assert.deepEqual(listed.data?.["me"], {
      email: "jane@example.com",
      sessions: [{ device: "Chrome on Windows", current: true }]
    });
  });

  it("answers one code for a wrong password and for an address nobody registered", async () => {
    for (const input of [
      { email: "jane@example.com", password: "not the password" },
      { email: "nobody@example.com", password: "correct horse battery staple" }
    ]) {
      const answer = await runOperation(
        schema,
        `mutation Login($input: LoginInput!) { login(input: $input) { ${authenticationFields} } }`,
        { input },
        context
      );
      const payload = answer.data?.["login"] as {
        customer: unknown;
        errors: readonly { code: string }[];
      };
      assert.equal(payload.customer, null);
      assert.equal(payload.errors[0]?.code, "CREDENTIALS_INVALID");
    }
  });

  it("moves the anonymous cart and merges the anonymous wishlist on login", async () => {
    const withCookie = await contextFor({ cartCookie: "visitor-one" });
    await runOperation(
      schema,
      "mutation Save($productId: ID!) { addToWishlist(productId: $productId) { products { id } } }",
      { productId: "product-05" },
      { ...withCookie, wishlistOwner: () => ({ customerId: null, visitorKey: "visitor-one" }) }
    );
    await runOperation(
      schema,
      `mutation Login($input: LoginInput!) { login(input: $input) { ${authenticationFields} } }`,
      { input: { email: "jane@example.com", password: "correct horse battery staple" } },
      withCookie
    );
    assert.deepEqual(mergedCarts, ["visitor-one:customer-01"]);

    const owned = await runOperation(
      schema,
      "{ wishlist { id } }",
      {},
      { ...withCookie, wishlistOwner: () => ({ customerId: "customer-01", visitorKey: null }) }
    );
    assert.deepEqual(owned.data?.["wishlist"], [{ id: "product-05" }]);
  });

  it("keeps a wishlist for a visitor who is not signed in", async () => {
    const saved = await runOperation(
      schema,
      "mutation Save($productId: ID!) { addToWishlist(productId: $productId) { products { id } errors { code } } }",
      { productId: "product-05" },
      context
    );
    const payload = saved.data?.["addToWishlist"] as {
      products: readonly { id: string }[];
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.deepEqual(payload.products, [{ id: "product-05" }]);

    const removed = await runOperation(
      schema,
      "mutation Forget($productId: ID!) { removeFromWishlist(productId: $productId) { products { id } errors { code } } }",
      { productId: "product-05" },
      context
    );
    assert.deepEqual((removed.data?.["removeFromWishlist"] as { products: readonly unknown[] }).products, []);
  });

  it("rotates the refresh token and revokes the family when a rotated token comes back", async () => {
    await runOperation(
      schema,
      `mutation Login($input: LoginInput!) { login(input: $input) { ${authenticationFields} } }`,
      { input: { email: "jane@example.com", password: "correct horse battery staple" } },
      context
    );
    const firstToken = refreshValueOf(writtenCookies[0] ?? "");

    const rotated = await runOperation(
      schema,
      `mutation { refreshSession { ${authenticationFields} } }`,
      {},
      { ...context, refreshCookie: firstToken }
    );
    assert.deepEqual((rotated.data?.["refreshSession"] as { errors: readonly unknown[] }).errors, []);
    const secondToken = refreshValueOf(writtenCookies[1] ?? "");
    assert.notEqual(secondToken, firstToken);

    const replayed = await runOperation(
      schema,
      `mutation { refreshSession { ${authenticationFields} } }`,
      {},
      { ...context, refreshCookie: firstToken }
    );
    assert.equal(
      (replayed.data?.["refreshSession"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "SESSION_INVALID"
    );

    const afterRevocation = await runOperation(
      schema,
      `mutation { refreshSession { ${authenticationFields} } }`,
      {},
      { ...context, refreshCookie: secondToken }
    );
    assert.equal(
      (afterRevocation.data?.["refreshSession"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "SESSION_INVALID"
    );
  });

  it("refuses a refresh with no cookie at all", async () => {
    const answer = await runOperation(
      schema,
      `mutation { refreshSession { ${authenticationFields} } }`,
      {},
      context
    );
    assert.equal(
      (answer.data?.["refreshSession"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "SESSION_INVALID"
    );
  });

  it("says a session is live until it is revoked", async () => {
    await runOperation(
      schema,
      `mutation Login($input: LoginInput!) { login(input: $input) { ${authenticationFields} } }`,
      { input: { email: "jane@example.com", password: "correct horse battery staple" } },
      context
    );
    const sessions = await context.sessions.openSessionsFor("customer-01");
    const sessionId = sessions[0]?.id ?? "";

    const live = await runOperation(
      schema,
      "query Live($sessionId: ID!) { isSessionLive(sessionId: $sessionId) }",
      { sessionId },
      context
    );
    assert.equal(live.data?.["isSessionLive"], true);

    await runOperation(
      schema,
      "mutation Revoke($sessionId: ID!) { revokeSession(sessionId: $sessionId) { sessions { id } errors { code } } }",
      { sessionId },
      { ...context, ...signedInContext("customer-01", sessionId) }
    );

    const gone = await runOperation(
      schema,
      "query Live($sessionId: ID!) { isSessionLive(sessionId: $sessionId) }",
      { sessionId },
      context
    );
    assert.equal(gone.data?.["isSessionLive"], false);
  });

  it("refuses to revoke a session that is not the customer's and refuses without a customer", async () => {
    const unknown = await runOperation(
      schema,
      "mutation Revoke($sessionId: ID!) { revokeSession(sessionId: $sessionId) { sessions { id } errors { code } } }",
      { sessionId: "session-nothing" },
      { ...context, ...signedInContext("customer-01", "session-01") }
    );
    assert.equal(
      (unknown.data?.["revokeSession"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "SESSION_NOT_FOUND"
    );

    const anonymous = await runOperation(
      schema,
      "mutation Revoke($sessionId: ID!) { revokeSession(sessionId: $sessionId) { sessions { id } errors { code } } }",
      { sessionId: "session-01" },
      context
    );
    assert.equal(
      (anonymous.data?.["revokeSession"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "NOT_AUTHENTICATED"
    );
  });

  it("logs out twice with the same answer and clears the cookie", async () => {
    const first = await runOperation(
      schema,
      "mutation { logout { success errors { code } } }",
      {},
      { ...context, ...signedInContext("customer-01", "session-01") }
    );
    assert.deepEqual(first.data?.["logout"], { success: true, errors: [] });
    const second = await runOperation(schema, "mutation { logout { success errors { code } } }", {}, context);
    assert.deepEqual(second.data?.["logout"], { success: true, errors: [] });
    assert.match(writtenCookies.at(-1) ?? "", /^zappy_refresh=;/);
  });

  it("answers null for me without an access token", async () => {
    const answer = await runOperation(schema, "{ me { email } }", {}, context);
    assert.equal(answer.data?.["me"], null);
  });

  it("resolves a customer reference the way the router asks for it", async () => {
    const answer = await runOperation(
      schema,
      `query Reference($representations: [_Any!]!) {
        _entities(representations: $representations) { ... on Customer { id email name } }
      }`,
      { representations: [{ __typename: "Customer", id: "customer-01" }] },
      context
    );
    assert.deepEqual(answer.data?.["_entities"], [
      { id: "customer-01", email: "jane@example.com", name: "Jane Doe" }
    ]);
  });

  it("lists the newest session first when two logins share one clock reading", async () => {
    const customers = sqlCustomerRepository(database);
    const sessionStore = sqlSessionRepository(database);
    const refreshTokens = sqlRefreshTokenRepository(database);
    const wishlists = sqlWishlistRepository(database);
    const keys = await generateSigningKeys();
    const clock = fixedClock(new Date("2026-09-09T12:00:00.000Z"));
    const signIn = authenticate(
      customers,
      sessionStore,
      refreshTokens,
      wishlists,
      readablePasswordHasher,
      rsaTokenIssuer(keys, () => clock.now()),
      cartMerger,
      inMemoryAttemptLimiter(),
      () => clock.now()
    );
    const credentials = { email: "jane@example.com", password: "correct horse battery staple" };
    await signIn.login({ ...credentials, device: "Laptop", userAgent: null, visitorKey: null, callerKey: "one" });
    await signIn.login({ ...credentials, device: "Phone", userAgent: null, visitorKey: null, callerKey: "two" });

    const open = await manageSessions(sessionStore, refreshTokens, () => clock.now()).openSessionsFor(
      "customer-01"
    );
    assert.deepEqual(open.map((session) => session.device), ["Phone", "Laptop"]);
    assert.equal(open[0]?.createdAt, open[1]?.createdAt);
  });

  it("publishes one signing key as a JSON web key set", async () => {
    const keys = await generateSigningKeys();
    const published = jsonWebKeySet(keys);
    assert.equal(published.keys.length, 1);
    assert.equal(published.keys[0]?.alg, "RS256");
    assert.equal(published.keys[0]?.use, "sig");
    assert.equal(published.keys[0]?.kty, "RSA");
    assert.equal(published.keys[0]?.kid, keys.keyIdentifier);
    assert.equal(published.keys[0]?.d, undefined);
  });
});

function refreshValueOf(cookie: string): string {
  const pair = cookie.split(";")[0] ?? "";
  return decodeURIComponent(pair.slice(pair.indexOf("=") + 1));
}
