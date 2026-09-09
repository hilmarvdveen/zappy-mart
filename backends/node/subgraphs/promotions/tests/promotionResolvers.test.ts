import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import {
  createHandledEventTable,
  money,
  openInMemoryDatabase,
  sqlHandledEventStore,
  systemClock
} from "@zappy/shared";
import { anonymousContext, buildTestSchema, runOperation } from "@zappy/shared/testing";
import { createPromotionTables } from "../src/adapters/persistence/promotionTables.js";
import {
  sqlAppliedPromotionStore,
  sqlPromotionCodeRepository
} from "../src/adapters/persistence/sqlPromotionRepository.js";
import { managePromotions } from "../src/application/applyPromotionCode.js";
import { promotionInteractions } from "../src/application/promotionInteractions.js";
import { resetPromotionSeed } from "../src/application/resetSeed.js";
import type { CartReader, CartReference } from "../src/application/ports.js";
import { promotionsResolvers } from "../src/adapters/graphql/resolvers.js";
import type { PromotionsContext } from "../src/adapters/graphql/context.js";

let database: Database;
let context: PromotionsContext;
let currentCart: CartReference = { id: "cart-01", subtotal: money(1970) };
const schema = buildTestSchema<PromotionsContext>("promotions", promotionsResolvers);

const fixedCartReader: CartReader = {
  async readCurrentCart(): Promise<CartReference | null> {
    return currentCart;
  }
};

const cartPayloadFields = "cart { id } availableStock errors { code message field }";

before(async () => {
  database = openInMemoryDatabase();
  await createPromotionTables(database);
  await createHandledEventTable(database);
});

beforeEach(async () => {
  const codes = sqlPromotionCodeRepository(database);
  const applied = sqlAppliedPromotionStore(database);
  const handledEvents = sqlHandledEventStore(database, () => systemClock.now());
  const reloadSeed = resetPromotionSeed(codes, applied, handledEvents);
  await reloadSeed();
  currentCart = { id: "cart-01", subtotal: money(1970) };
  const promotions = managePromotions(codes, applied, () => systemClock.now());
  context = {
    ...anonymousContext(),
    promotions,
    interactions: promotionInteractions(promotions, handledEvents),
    carts: fixedCartReader,
    resetOwnData: reloadSeed
  };
});

after(async () => {
  await database.close();
});

async function amountsFor(cartId: string, subtotal: number): Promise<Record<string, unknown>> {
  const answer = await runOperation(
    schema,
    `query Reference($representations: [_Any!]!) {
      _entities(representations: $representations) {
        ... on Cart {
          promotion { code kind discount { amount } }
          shipping { amount }
          total { amount }
        }
      }
    }`,
    { representations: [{ __typename: "Cart", id: cartId, subtotal: { amount: subtotal, currency: "EUR" } }] },
    context
  );
  return (answer.data?.["_entities"] as readonly Record<string, unknown>[])[0] ?? {};
}

describe("the promotions subgraph", () => {
  it("answers a cart with no code with the plain shipping and total", async () => {
    assert.deepEqual(await amountsFor("cart-01", 1970), {
      promotion: null,
      shipping: { amount: 495 },
      total: { amount: 2465 }
    });
  });

  it("applies a percentage code and works the discount out from the required subtotal", async () => {
    currentCart = { id: "cart-01", subtotal: money(5599) };
    const answer = await runOperation(
      schema,
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartPayloadFields} } }`,
      { code: "welcome10" },
      context
    );
    assert.deepEqual((answer.data?.["applyPromotionCode"] as { errors: readonly unknown[] }).errors, []);
    assert.deepEqual(await amountsFor("cart-01", 5599), {
      promotion: { code: "WELCOME10", kind: "PERCENTAGE", discount: { amount: 560 } },
      shipping: { amount: 0 },
      total: { amount: 5039 }
    });
  });

  it("makes the shipping free with a free shipping code and keeps the discount at nothing", async () => {
    await runOperation(
      schema,
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartPayloadFields} } }`,
      { code: "FREESHIP" },
      context
    );
    assert.deepEqual(await amountsFor("cart-01", 1970), {
      promotion: { code: "FREESHIP", kind: "FREE_SHIPPING", discount: { amount: 0 } },
      shipping: { amount: 0 },
      total: { amount: 1970 }
    });
  });

  it("caps a fixed amount code at the subtotal", async () => {
    currentCart = { id: "cart-01", subtotal: money(2500) };
    await runOperation(
      schema,
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartPayloadFields} } }`,
      { code: "FIVEOFF" },
      context
    );
    assert.deepEqual(await amountsFor("cart-01", 2500), {
      promotion: { code: "FIVEOFF", kind: "FIXED_AMOUNT", discount: { amount: 500 } },
      shipping: { amount: 495 },
      total: { amount: 2495 }
    });
  });

  it("refuses the four ways a code can be turned down", async () => {
    currentCart = { id: "cart-01", subtotal: money(795) };
    for (const [code, expected] of [
      ["NOSUCHCODE", "CODE_UNKNOWN"],
      ["SUMMER2025", "CODE_EXPIRED"],
      ["ONCE", "CODE_EXHAUSTED"],
      ["FIVEOFF", "CODE_MINIMUM_NOT_MET"]
    ] as const) {
      const answer = await runOperation(
        schema,
        `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartPayloadFields} } }`,
        { code },
        context
      );
      const payload = answer.data?.["applyPromotionCode"] as { errors: readonly { code: string }[] };
      assert.equal(payload.errors[0]?.code, expected, `${code} should answer ${expected}`);
    }
  });

  it("replaces the code when a second one is applied and removes it on request", async () => {
    await runOperation(
      schema,
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartPayloadFields} } }`,
      { code: "WELCOME10" },
      context
    );
    await runOperation(
      schema,
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartPayloadFields} } }`,
      { code: "FREESHIP" },
      context
    );
    const replaced = (await amountsFor("cart-01", 1970))["promotion"] as { code: string };
    assert.equal(replaced.code, "FREESHIP");

    const removed = await runOperation(
      schema,
      `mutation { removePromotionCode { ${cartPayloadFields} } }`,
      {},
      context
    );
    assert.deepEqual((removed.data?.["removePromotionCode"] as { errors: readonly unknown[] }).errors, []);
    assert.equal((await amountsFor("cart-01", 1970))["promotion"], null);
  });

  it("counts a use when the ordering subgraph reports an order", async () => {
    const codes = sqlPromotionCodeRepository(database);
    const counted = await runOperation(
      schema,
      'mutation { countPromotionUse(code: "welcome10", orderId: "order-01", eventId: "outbox-01") }',
      {},
      context
    );
    assert.equal(counted.data?.["countPromotionUse"], true);
    assert.equal((await codes.readByCode("WELCOME10"))?.timesUsed, 1);

    const unknown = await runOperation(
      schema,
      'mutation { countPromotionUse(code: "NOSUCHCODE", orderId: "order-02", eventId: "outbox-02") }',
      {},
      context
    );
    assert.equal(unknown.data?.["countPromotionUse"], false);
  });

  it("clears the promotion of a cart by its id for the ordering subgraph", async () => {
    await runOperation(
      schema,
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartPayloadFields} } }`,
      { code: "WELCOME10" },
      context
    );
    const cleared = await runOperation(
      schema,
      'mutation { clearCartPromotion(cartId: "cart-01") }',
      {},
      context
    );
    assert.equal(cleared.data?.["clearCartPromotion"], true);
    assert.equal((await amountsFor("cart-01", 1970))["promotion"], null);
  });
});
