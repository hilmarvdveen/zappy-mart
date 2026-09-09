import { expect, test } from "vitest";
import { buildCookieHeader, readCookieChanges } from "./setCookies";

test("a set cookie header becomes a name and a value", () => {
  const changes = readCookieChanges([
    "zappy_cart=cart-token-01; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);

  expect(changes.get("zappy_cart")).toBe("cart-token-01");
});

test("an empty value means the store took the cookie away", () => {
  const changes = readCookieChanges([
    "zappy_refresh=; Path=/graphql; Max-Age=0",
  ]);

  expect(changes.has("zappy_refresh")).toBe(true);
  expect(changes.get("zappy_refresh")).toBeNull();
});

test("an age of zero means the store took the cookie away", () => {
  const changes = readCookieChanges(["zappy_cart=stale; Max-Age=0"]);

  expect(changes.get("zappy_cart")).toBeNull();
});

test("a date in the past means the store took the cookie away", () => {
  const changes = readCookieChanges([
    "zappy_cart=stale; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ]);

  expect(changes.get("zappy_cart")).toBeNull();
});

test("a header without a name and a value is skipped", () => {
  const changes = readCookieChanges(["nonsense", ""]);

  expect(changes.size).toBe(0);
});

test("the cookie header names only the cookies that carry a value", () => {
  expect(
    buildCookieHeader({
      zappy_cart: "cart-token-01",
      zappy_refresh: null,
    }),
  ).toBe("zappy_cart=cart-token-01");
});

test("no cookie at all means no cookie header", () => {
  expect(buildCookieHeader({ zappy_cart: null })).toBeNull();
});
