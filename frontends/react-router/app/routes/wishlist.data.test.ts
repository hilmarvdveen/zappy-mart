import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./wishlist";
import { cottonJacket } from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader reads the wishlist the store keeps for an anonymous visitor", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ wishlist: [cottonJacket] }),
  );
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/wishlist`)),
  );

  expect(loaded.signedIn).toBe(false);
  expect(loaded.products).toHaveLength(1);
});

test("the loader says the customer is signed in once there is an access token", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ wishlist: [] }));
  const connection = await openConnectionForTest({ signedIn: true });

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/wishlist`)),
  );

  expect(loaded.signedIn).toBe(true);
  expect(loaded.products).toEqual([]);
});

test("the action takes a product off the wishlist", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ removeFromWishlist: { products: [], errors: [] } }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/wishlist", { productId: "product-03" }),
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    productId: "product-03",
  });
  expect(outcome.problems).toEqual([]);
});
