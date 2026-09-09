import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./product";
import { cottonJacket } from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
  statusOfRefusal,
} from "~/testing/storeTestSupport";

const productAnswer = {
  product: { ...cottonJacket, description: "A jacket for every season." },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader reads one product by the slug in the address", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(productAnswer));
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(`${storeFrontAddress}/products/mens-cotton-jacket`),
      { slug: "mens-cotton-jacket" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    slug: "mens-cotton-jacket",
  });
  expect(loaded.product.name).toBe("Mens Cotton Jacket");
});

test("the loader answers not found when no product has the slug", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ product: null }));
  const connection = await openConnectionForTest();

  expect(
    await statusOfRefusal(
      loader(
        routeArgumentsFor(
          connection,
          new Request(`${storeFrontAddress}/products/nothing`),
          { slug: "nothing" },
        ),
      ),
    ),
  ).toBe(404);
});

test("the action adds the wanted quantity to the cart and confirms it", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      addToCart: { cart: null, availableStock: null, errors: [] },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/products/mens-cotton-jacket", {
        intent: "addToCart",
        productId: "product-03",
        quantity: "2",
      }),
      { slug: "mens-cotton-jacket" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    productId: "product-03",
    quantity: 2,
  });
  expect(outcome.confirmations).toEqual(["Added to your cart."]);
});

test("the action turns a refusal into a sentence and names the stock that is left", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      addToCart: {
        cart: null,
        availableStock: 1,
        errors: [
          {
            code: "OUT_OF_STOCK",
            message: "Only one left.",
            field: "quantity",
          },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/products/wd-4tb-gaming-drive-playstation-4", {
        intent: "addToCart",
        productId: "product-12",
        quantity: "2",
      }),
      { slug: "wd-4tb-gaming-drive-playstation-4" },
    ),
  );

  expect(outcome.problems).toEqual([
    "There is not enough stock for that quantity.",
  ]);
  expect(outcome.availableStock).toBe(1);
});

test("the action saves a product on the wishlist the store keeps", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ addToWishlist: { products: [], errors: [] } }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/products/mens-cotton-jacket", {
        intent: "saveToWishlist",
        productId: "product-03",
      }),
      { slug: "mens-cotton-jacket" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    productId: "product-03",
  });
  expect(outcome.confirmations).toEqual(["Saved to your wishlist."]);
});

test("the action refuses an intent the product page does not know", async () => {
  const connection = await openConnectionForTest();

  expect(
    await statusOfRefusal(
      action(
        routeArgumentsFor(
          connection,
          formRequest("/products/mens-cotton-jacket", { intent: "shout" }),
          { slug: "mens-cotton-jacket" },
        ),
      ),
    ),
  ).toBe(400);
});
