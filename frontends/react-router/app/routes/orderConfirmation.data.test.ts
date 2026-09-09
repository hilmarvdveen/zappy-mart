import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { loader } from "./orderConfirmation";
import { placedOrder } from "~/testing/fixtures";
import {
  answerWith,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
  statusOfRefusal,
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
        new Request(`${storeFrontAddress}/orders/order-01`),
        { orderId: "order-01" },
      ),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader reads the order by the id in the address", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ order: placedOrder }));
  const connection = await openConnectionForTest({ signedIn: true });

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(`${storeFrontAddress}/orders/order-01`),
      { orderId: "order-01" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({ id: "order-01" });
  expect(loaded.order.number).toBe("ZM-1001");
});

test("the loader answers not found for an order of somebody else", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ order: null }));
  const connection = await openConnectionForTest({ signedIn: true });

  expect(
    await statusOfRefusal(
      loader(
        routeArgumentsFor(
          connection,
          new Request(`${storeFrontAddress}/orders/order-99`),
          { orderId: "order-99" },
        ),
      ),
    ),
  ).toBe(404);
});
