import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { createStore, loadSeed } from "../state.mjs";
import {
  findAnonymousWishlist,
  findCustomerByEmailAddress,
  hashPassword,
  isEmailAddress,
  issueAccessToken,
  mergeAnonymousWishlistIntoCustomer,
  normaliseEmailAddress,
  openAnonymousWishlist,
  openSession,
  openSessionsOf,
  presentWishlist,
  readAccessToken,
  readVisitorFromAccessToken,
  revokeSessionFamily,
  rotateSession,
  verifyPassword
} from "../accounts.mjs";

const now = new Date("2026-09-09T12:00:00Z");
const seedPassword = "correct horse battery staple";

describe("accounts", () => {
  const store = createStore();

  beforeEach(async () => {
    await loadSeed(store, hashPassword);
  });

  test("stores the seed password as a hash and never in clear", () => {
    const customer = findCustomerByEmailAddress(store, "jane@example.com");
    assert.ok(customer.passwordHash.startsWith("scrypt:"));
    assert.ok(!customer.passwordHash.includes(seedPassword));
    assert.equal(customer.password, undefined);
  });

  test("verifies the right password and refuses a wrong one", async () => {
    const customer = findCustomerByEmailAddress(store, "jane@example.com");
    assert.equal(await verifyPassword(seedPassword, customer.passwordHash), true);
    assert.equal(await verifyPassword("correct horse battery stapl", customer.passwordHash), false);
  });

  test("hashes the same password to a different value every time", async () => {
    const first = await hashPassword("a long enough password");
    const second = await hashPassword("a long enough password");
    assert.notEqual(first, second);
    assert.equal(await verifyPassword("a long enough password", first), true);
  });

  test("normalises an email address and recognises a valid one", () => {
    assert.equal(normaliseEmailAddress("  Jane@Example.COM "), "jane@example.com");
    assert.equal(isEmailAddress("jane@example.com"), true);
    assert.equal(isEmailAddress("jane-at-example"), false);
    assert.equal(isEmailAddress("jane@example"), false);
  });

  test("signs an access token that carries the customer and the session and nothing personal", async () => {
    const { token, expiresAt } = await issueAccessToken(store, "customer-01", "session-01", now);
    assert.equal(expiresAt.getTime() - now.getTime(), 15 * 60 * 1000);

    const claims = await readAccessToken(store, token);
    assert.deepEqual(claims, { customerId: "customer-01", sessionId: "session-01" });

    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    assert.equal(payload.email, undefined);
    assert.equal(payload.name, undefined);
  });

  test("refuses an access token that another secret signed", async () => {
    const { token } = await issueAccessToken(store, "customer-01", "session-01", now);
    const otherStore = createStore();
    assert.equal(await readAccessToken(otherStore, token), null);
    assert.equal(await readAccessToken(store, "not.a.token"), null);
  });

  test("refuses an access token that has expired", async () => {
    const longAgo = new Date("2026-01-01T00:00:00Z");
    const { token } = await issueAccessToken(store, "customer-01", "session-01", longAgo);
    assert.equal(await readAccessToken(store, token), null);
  });

  test("opens a session with a refresh token that is stored hashed", () => {
    const { session, refreshToken } = openSession(store, "customer-01", "Chrome on Windows", now);
    assert.equal(session.device, "Chrome on Windows");
    assert.equal(store.refreshTokens.length, 1);
    assert.notEqual(store.refreshTokens[0].tokenHash, refreshToken);
    assert.ok(!JSON.stringify(store.refreshTokens).includes(refreshToken));
  });

  test("uses a refresh token once and answers a new one", () => {
    const opened = openSession(store, "customer-01", "Chrome on Windows", now);
    const later = new Date(now.getTime() + 60_000);

    const rotation = rotateSession(store, opened.refreshToken, later);

    assert.equal(rotation.errorCode, null);
    assert.notEqual(rotation.refreshToken, opened.refreshToken);
    assert.equal(rotation.session.id, opened.session.id);
    assert.equal(rotation.session.lastUsedAt, later);
  });

  test("revokes the whole session family when a rotated token comes back", () => {
    const opened = openSession(store, "customer-01", "Chrome on Windows", now);
    const rotation = rotateSession(store, opened.refreshToken, now);

    const replay = rotateSession(store, opened.refreshToken, now);

    assert.equal(replay.errorCode, "SESSION_INVALID");
    assert.equal(opened.session.revokedAt, now);
    assert.equal(rotateSession(store, rotation.refreshToken, now).errorCode, "SESSION_INVALID");
    assert.deepEqual(openSessionsOf(store, "customer-01", now), []);
  });

  test("refuses an unknown refresh token", () => {
    assert.equal(rotateSession(store, "nothing-like-a-token", now).errorCode, "SESSION_INVALID");
  });

  test("refuses a refresh token of an expired session", () => {
    const opened = openSession(store, "customer-01", "Chrome on Windows", now);
    const wellPastThirtyDays = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

    assert.equal(rotateSession(store, opened.refreshToken, wellPastThirtyDays).errorCode, "SESSION_INVALID");
  });

  test("lists the open sessions of a customer newest first", () => {
    const older = openSession(store, "customer-01", "Chrome on Windows", now);
    const newer = openSession(store, "customer-01", "Firefox on Linux", new Date(now.getTime() + 1000));

    assert.deepEqual(
      openSessionsOf(store, "customer-01", now).map((session) => session.device),
      ["Firefox on Linux", "Chrome on Windows"]
    );

    revokeSessionFamily(store, newer.session, now);
    assert.deepEqual(
      openSessionsOf(store, "customer-01", now).map((session) => session.id),
      [older.session.id]
    );
  });

  test("presents the wishlist newest first", () => {
    const customer = findCustomerByEmailAddress(store, "jane@example.com");
    customer.wishlistProductIds = ["product-01", "product-05"];

    assert.deepEqual(
      presentWishlist(store, customer).map((product) => product.id),
      ["product-05", "product-01"]
    );
  });

  test("accepts an access token only while its session is open", async () => {
    const opened = openSession(store, "customer-01", "Chrome on Windows", now);
    const { token } = await issueAccessToken(store, "customer-01", opened.session.id, now);

    assert.deepEqual(await readVisitorFromAccessToken(store, token, now), {
      customerId: "customer-01",
      sessionId: opened.session.id
    });

    revokeSessionFamily(store, opened.session, now);
    assert.equal(await readVisitorFromAccessToken(store, token, now), null);
  });

  test("refuses an access token whose session was never opened", async () => {
    const { token } = await issueAccessToken(store, "customer-01", "session-that-never-was", now);
    assert.equal(await readVisitorFromAccessToken(store, token, now), null);
  });

  test("keeps an anonymous wishlist against the anonymous id", () => {
    const wishlist = openAnonymousWishlist(store, "cart-anonymous");
    wishlist.wishlistProductIds.push("product-06");

    assert.equal(findAnonymousWishlist(store, "cart-anonymous"), wishlist);
    assert.equal(findAnonymousWishlist(store, "cart-nothing"), null);
    assert.equal(openAnonymousWishlist(store, "cart-anonymous"), wishlist);
    assert.equal(store.anonymousWishlists.length, 1);
  });

  test("merges an anonymous wishlist into the customer without repeating a product", () => {
    const customer = findCustomerByEmailAddress(store, "jane@example.com");
    customer.wishlistProductIds = ["product-06"];
    openAnonymousWishlist(store, "cart-anonymous").wishlistProductIds.push("product-06", "product-01");

    mergeAnonymousWishlistIntoCustomer(store, "cart-anonymous", customer);

    assert.deepEqual(customer.wishlistProductIds, ["product-06", "product-01"]);
    assert.equal(findAnonymousWishlist(store, "cart-anonymous"), null);
  });

  test("merges nothing when the visitor has no anonymous wishlist", () => {
    const customer = findCustomerByEmailAddress(store, "jane@example.com");

    mergeAnonymousWishlistIntoCustomer(store, null, customer);
    mergeAnonymousWishlistIntoCustomer(store, "cart-nothing", customer);

    assert.deepEqual(customer.wishlistProductIds, []);
  });
});
