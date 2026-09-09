import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./cart";
import { cartWithOneJacket, cartWithPromotion } from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
  statusOfRefusal,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

async function runCartAction(fields: Record<string, string>) {
  const connection = await openConnectionForTest();
  return action(
    routeArgumentsFor(connection, formRequest("/cart", fields)),
  );
}

test("the loader hands the screen the cart the store keeps", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ cart: cartWithOneJacket }),
  );
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/cart`)),
  );

  expect(loaded.cart.lines).toHaveLength(1);
});

test("the action changes the quantity of one line", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      changeCartLineQuantity: {
        cart: cartWithOneJacket,
        availableStock: null,
        errors: [],
      },
    }),
  );

  const outcome = await runCartAction({
    intent: "changeQuantity",
    lineId: "line-01",
    quantity: "3",
  });

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    lineId: "line-01",
    quantity: 3,
  });
  expect(outcome.problems).toEqual([]);
});

test("the action removes one line", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      removeCartLine: { cart: cartWithOneJacket, errors: [] },
    }),
  );

  const outcome = await runCartAction({
    intent: "removeLine",
    lineId: "line-01",
  });

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    lineId: "line-01",
  });
  expect(outcome.problems).toEqual([]);
});

test("the action applies a promotion code without the spaces around it", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      applyPromotionCode: { cart: cartWithPromotion, errors: [] },
    }),
  );

  await runCartAction({
    intent: "applyPromotionCode",
    promotionCode: "  welcome10  ",
  });

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    code: "welcome10",
  });
});

test("the action explains a promotion code the store refused", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      applyPromotionCode: {
        cart: cartWithOneJacket,
        errors: [
          { code: "CODE_EXPIRED", message: "The window closed.", field: null },
        ],
      },
    }),
  );

  const outcome = await runCartAction({
    intent: "applyPromotionCode",
    promotionCode: "SUMMER2025",
  });

  expect(outcome.problems).toEqual(["That promotion code has expired."]);
});

test("the action takes the promotion code off again", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      removePromotionCode: { cart: cartWithOneJacket, errors: [] },
    }),
  );

  const outcome = await runCartAction({ intent: "removePromotionCode" });

  expect(outcome.problems).toEqual([]);
});

test("the action refuses an intent the cart does not know", async () => {
  expect(await statusOfRefusal(runCartAction({ intent: "empty-everything" }))).toBe(
    400,
  );
});
