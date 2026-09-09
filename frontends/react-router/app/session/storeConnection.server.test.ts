import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { shellQuery } from "~/graphql/documents";
import { connectToStore } from "./storeConnection.server";
import {
  answerWith,
  requestWithSession,
  storeFrontAddress,
  statusOfRefusal,
} from "~/testing/storeTestSupport";

const freshSession = {
  customer: { id: "customer-01", name: "Jane Doe" },
  accessToken: "renewed-access-token",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  errors: [],
};

const emptyShell = {
  cart: { lines: [] },
  wishlist: [],
  me: null,
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("an anonymous visitor costs no refresh call", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(emptyShell));

  const connection = await connectToStore(
    new Request(`${storeFrontAddress}/`),
  );

  expect(connection.signedIn).toBe(false);
  expect(vi.mocked(callStore)).not.toHaveBeenCalled();
});

test("a session with a refresh cookie renews the access token before the first call", async () => {
  vi.mocked(callStore).mockResolvedValueOnce(
    answerWith({ refreshSession: freshSession }),
  );

  const connection = await connectToStore(
    await requestWithSession({ refreshCookie: "refresh-token-01" }),
  );

  expect(connection.signedIn).toBe(true);
  expect(connection.customerName).toBe("Jane Doe");
  expect(connection.sessionEnded).toBe(false);
  expect(vi.mocked(callStore)).toHaveBeenCalledTimes(1);
});

test("a refused renewal ends the session and says so", async () => {
  vi.mocked(callStore).mockResolvedValueOnce(
    answerWith({
      refreshSession: {
        customer: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        errors: [
          {
            code: "SESSION_INVALID",
            message: "That refresh token was already used.",
            field: null,
          },
        ],
      },
    }),
  );

  const connection = await connectToStore(
    await requestWithSession({
      refreshCookie: "already-rotated-token",
      accessToken: "old-access-token",
    }),
  );

  expect(connection.signedIn).toBe(false);
  expect(connection.sessionEnded).toBe(true);
});

test("a fresh access token is used again instead of renewed", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(emptyShell));

  const connection = await connectToStore(
    await requestWithSession({
      refreshCookie: "refresh-token-01",
      accessToken: "still-fresh",
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
      accessTokenObtainedAt: new Date().toISOString(),
    }),
  );
  await connection.run(shellQuery, {});

  expect(vi.mocked(callStore)).toHaveBeenCalledTimes(1);
  expect(vi.mocked(callStore).mock.calls[0]?.[2]).toMatchObject({
    accessToken: "still-fresh",
  });
});

test("the cart cookie the API sets is kept and sent back on the next call", async () => {
  vi.mocked(callStore).mockResolvedValue({
    data: emptyShell,
    failureMessage: null,
    setCookieHeaders: [
      "zappy_cart=cart-token-01; Path=/; HttpOnly; SameSite=Lax",
    ],
  });

  const connection = await connectToStore(
    new Request(`${storeFrontAddress}/`),
  );
  await connection.run(shellQuery, {});
  await connection.run(shellQuery, {});

  expect(vi.mocked(callStore).mock.calls[1]?.[2]).toMatchObject({
    cartCookie: "cart-token-01",
  });
  const headers = await connection.headers();
  expect(headers.get("Set-Cookie")).toContain("zappy_store_front=");
});

test("a store that answers nothing becomes a bad gateway", async () => {
  vi.mocked(callStore).mockResolvedValue({
    data: null,
    failureMessage: "The store is asleep.",
    setCookieHeaders: [],
  });

  const connection = await connectToStore(
    new Request(`${storeFrontAddress}/`),
  );

  expect(await statusOfRefusal(connection.run(shellQuery, {}))).toBe(502);
});
