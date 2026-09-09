import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./checkout";
import { cartWithPromotion, emptyCart, placedOrder } from "~/testing/fixtures";
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

test("the loader sends a visitor who is not signed in to the login screen", async () => {
  const connection = await openConnectionForTest();

  await expect(
    loader(
      routeArgumentsFor(
        connection,
        new Request(`${storeFrontAddress}/checkout`),
      ),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader sends a customer with an empty cart back to the cart", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ cart: emptyCart }));
  const connection = await openConnectionForTest({ signedIn: true });

  await expect(
    loader(
      routeArgumentsFor(
        connection,
        new Request(`${storeFrontAddress}/checkout`),
      ),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader makes one idempotency key per checkout attempt", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ cart: cartWithPromotion }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const first = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/checkout`)),
  );
  const second = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/checkout`)),
  );

  expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
  expect(first.customerName).toBe("Jane Doe");
});

test("the action places the order and sends the customer to the confirmation", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ placeOrder: { order: placedOrder, errors: [] } }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/checkout", {
        intent: "placeOrder",
        idempotencyKey: "checkout-key-01",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    idempotencyKey: "checkout-key-01",
  });
  expect(outcome).toMatchObject({ status: 302 });
  expect((outcome as Response).headers.get("Location")).toBe("/orders/order-01");
});

test("the action explains why the store refused to place the order", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      placeOrder: {
        order: null,
        errors: [
          { code: "CART_EMPTY", message: "Nothing to order.", field: null },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/checkout", {
        intent: "placeOrder",
        idempotencyKey: "checkout-key-02",
      }),
    ),
  );

  expect(outcome.problems).toEqual([
    "Your cart is empty, so there is nothing to order.",
  ]);
});
