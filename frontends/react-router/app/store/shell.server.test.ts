import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { loadShell } from "./shell.server";
import {
  answerWith,
  openConnectionForTest,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the shell counts the quantities in the cart, not the lines", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      cart: { lines: [{ quantity: 2 }, { quantity: 3 }] },
      wishlist: [{ id: "product-03" }],
      me: null,
    }),
  );

  const shell = await loadShell(await openConnectionForTest());

  expect(shell.cartQuantity).toBe(5);
  expect(shell.wishlistCount).toBe(1);
  expect(shell.customerName).toBeNull();
});

test("the shell names the customer the store answers with", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      cart: { lines: [] },
      wishlist: [],
      me: { id: "customer-01", name: "Jane Doe" },
    }),
  );

  const shell = await loadShell(await openConnectionForTest({ signedIn: true }));

  expect(shell.customerName).toBe("Jane Doe");
});

test("the shell ends the session when the store no longer knows the access token", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ cart: { lines: [] }, wishlist: [], me: null }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const shell = await loadShell(connection);

  expect(shell.customerName).toBeNull();
  expect(connection.signedIn).toBe(false);
});
