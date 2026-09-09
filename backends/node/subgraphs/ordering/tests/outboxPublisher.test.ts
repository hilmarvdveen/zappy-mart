import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import {
  createHandledEventTable,
  money,
  openInMemoryDatabase,
  sqlHandledEventStore,
  zeroMoney
} from "@zappy/shared";
import { createOrderingTables } from "../src/adapters/persistence/orderingTables.js";
import { sqlOrderRepository } from "../src/adapters/persistence/sqlOrderRepository.js";
import { sqlOutboxStore } from "../src/adapters/persistence/sqlOutboxStore.js";
import { outboxPublisher, type OutboxPublisherSettings } from "../src/application/outboxPublisher.js";
import { placeOrder } from "../src/application/placeOrder.js";
import { stockReservationSaga } from "../src/application/stockReservationSaga.js";
import type {
  CartToOrderReader,
  OrderPlacedConsumers,
  OrderRepository,
  OutboxStore,
  StockReservationAnswer,
  StockReserver
} from "../src/application/ports.js";
import type { OrderableCart } from "../src/domain/order.js";
import { orderPlaced } from "../src/domain/orderPlaced.js";

let database: Database;
let orderStore: OrderRepository;
let outbox: OutboxStore;
let delivered: string[];
let failuresLeft: number;
let clock: Date;

const settings: OutboxPublisherSettings = {
  attemptBudget: 3,
  pollingIntervalInMilliseconds: 10,
  backoff: {
    firstDelayInMilliseconds: 0,
    growthFactor: 1,
    maximumDelayInMilliseconds: 0,
    jitterFraction: 0
  }
};

const cartWithACode: OrderableCart = {
  cartId: "cart-01",
  lines: [{ productId: "product-18", productName: "Boat Neck", unitPrice: money(985), quantity: 2 }],
  subtotal: money(1970),
  promotionCode: "WELCOME10",
  discount: money(197),
  shipping: money(495),
  total: money(2268)
};

const cartReader: CartToOrderReader = {
  async readOrderableCart(): Promise<OrderableCart | null> {
    return cartWithACode;
  }
};

const stockReserver: StockReserver = {
  async reserve(): Promise<StockReservationAnswer> {
    return { reserved: true, unavailableProductId: null, availableStock: null };
  },
  async release(): Promise<boolean> {
    return true;
  }
};

const consumers: OrderPlacedConsumers = {
  async emptyCart(cartId: string): Promise<void> {
    delivered.push(`emptyCart:${cartId}`);
  },
  async clearCartPromotion(cartId: string): Promise<void> {
    delivered.push(`clearCartPromotion:${cartId}`);
  },
  async countPromotionUse(code: string, _orderId: string, eventId: string): Promise<void> {
    delivered.push(`countPromotionUse:${code}:${eventId}`);
  },
  async sendConfirmation(): Promise<void> {
    if (failuresLeft > 0) {
      failuresLeft = failuresLeft - 1;
      throw new Error("the mail service is unreachable");
    }
    delivered.push("sendConfirmation");
  }
};

function publisher(): ReturnType<typeof outboxPublisher> {
  return outboxPublisher(outbox, consumers, () => clock, settings, () => 0);
}

async function placeOneOrder(idempotencyKey: string): Promise<void> {
  const outcome = await placeOrder(
    database,
    orderStore,
    outbox,
    cartReader,
    stockReservationSaga(stockReserver),
    { async publishDue() {
      return { published: 0, retried: 0, deadLettered: 0 };
    } },
    () => clock
  ).place("customer-01", idempotencyKey);
  assert.equal(outcome.kind, "placed");
}

before(async () => {
  database = openInMemoryDatabase();
  await createOrderingTables(database);
  await createHandledEventTable(database);
  orderStore = sqlOrderRepository(database);
  outbox = sqlOutboxStore(database);
});

beforeEach(async () => {
  await orderStore.removeEverything();
  delivered = [];
  failuresLeft = 0;
  clock = new Date("2026-09-09T10:00:00.000Z");
});

after(async () => {
  await database.close();
});

describe("the outbox publisher", () => {
  it("picks up the row that survived the crash between the commit and the publish", async () => {
    await placeOneOrder("checkout-crash");
    assert.deepEqual(delivered, []);
    assert.equal((await outbox.readUnpublished()).length, 1);

    const pass = await publisher().publishDue();

    assert.deepEqual(pass, { published: 1, retried: 0, deadLettered: 0 });
    assert.deepEqual(delivered.slice(0, 2), ["emptyCart:cart-01", "clearCartPromotion:cart-01"]);
    assert.equal(delivered.at(-1), "sendConfirmation");
    assert.equal((await outbox.readUnpublished()).length, 0);
  });

  it("carries the outbox row id as the event id, so a consumer can recognise a repeat", async () => {
    await placeOneOrder("checkout-event-id");
    const waiting = await outbox.readUnpublished();
    const rowId = waiting[0]?.id ?? "no row";
    await publisher().publishDue();
    assert.ok(delivered.includes(`countPromotionUse:WELCOME10:${rowId}`));
  });

  it("leaves the row for another pass when a consumer fails, and counts the attempt", async () => {
    await placeOneOrder("checkout-retry");
    failuresLeft = 1;

    const first = await publisher().publishDue();
    assert.deepEqual(first, { published: 0, retried: 1, deadLettered: 0 });
    const waiting = await outbox.readUnpublished();
    assert.equal(waiting[0]?.attempts, 1);
    assert.match(waiting[0]?.lastFailure ?? "", /mail service/);

    const second = await publisher().publishDue();
    assert.deepEqual(second, { published: 1, retried: 0, deadLettered: 0 });
    assert.equal((await outbox.readUnpublished()).length, 0);
  });

  it("waits for the moment it wrote before it tries the row again", async () => {
    await placeOneOrder("checkout-backoff");
    failuresLeft = 1;
    const waiting = outboxPublisher(outbox, consumers, () => clock, {
      ...settings,
      backoff: { ...settings.backoff, firstDelayInMilliseconds: 60_000, maximumDelayInMilliseconds: 60_000 }
    }, () => 0);

    await waiting.publishDue();
    assert.deepEqual(await outbox.readDue(clock.toISOString()), []);

    clock = new Date(clock.getTime() + 60_000);
    assert.equal((await outbox.readDue(clock.toISOString())).length, 1);
  });

  it("dead letters the row once the attempt budget is spent and stops trying", async () => {
    await placeOneOrder("checkout-dead-letter");
    failuresLeft = 10;
    const publishing = publisher();

    assert.deepEqual(await publishing.publishDue(), { published: 0, retried: 1, deadLettered: 0 });
    assert.deepEqual(await publishing.publishDue(), { published: 0, retried: 1, deadLettered: 0 });
    assert.deepEqual(await publishing.publishDue(), { published: 0, retried: 0, deadLettered: 1 });

    const dead = await outbox.readDeadLettered();
    assert.equal(dead.length, 1);
    assert.equal(dead[0]?.attempts, 3);

    assert.deepEqual(await publishing.publishDue(), { published: 0, retried: 0, deadLettered: 0 });
  });

  it("delivers at least once, so an idempotent consumer counts one use for two deliveries", async () => {
    const handledEvents = sqlHandledEventStore(database, () => clock);
    await handledEvents.forgetEverything();
    let counted = 0;
    const countingConsumers: OrderPlacedConsumers = {
      ...consumers,
      async countPromotionUse(_code: string, _orderId: string, eventId: string): Promise<void> {
        await handledEvents.onlyOnce(eventId, "promotions.countPromotionUse", async () => {
          counted = counted + 1;
        });
      },
      async sendConfirmation(): Promise<void> {
        if (failuresLeft > 0) {
          failuresLeft = failuresLeft - 1;
          throw new Error("the mail service is unreachable");
        }
      }
    };
    const publishing = outboxPublisher(outbox, countingConsumers, () => clock, settings, () => 0);

    await placeOneOrder("checkout-at-least-once");
    failuresLeft = 1;

    await publishing.publishDue();
    await publishing.publishDue();

    assert.equal(counted, 1);
    assert.equal((await outbox.readUnpublished()).length, 0);
  });

  it("publishes every row that is due in one pass", async () => {
    await placeOneOrder("checkout-many-one");
    await placeOneOrder("checkout-many-two");
    const pass = await publisher().publishDue();
    assert.deepEqual(pass, { published: 2, retried: 0, deadLettered: 0 });
  });

  it("writes the event the domain made, with its order and its cart", async () => {
    await placeOneOrder("checkout-payload");
    const waiting = await outbox.readUnpublished();
    const order = (await orderStore.readAllForCustomerNewestFirst("customer-01"))[0];
    assert.ok(order !== undefined);
    assert.deepEqual(waiting[0]?.event, orderPlaced(order, "cart-01"));
    assert.equal(waiting[0]?.event.promotionCode, "WELCOME10");
    assert.notEqual(order.total, zeroMoney);
  });
});
