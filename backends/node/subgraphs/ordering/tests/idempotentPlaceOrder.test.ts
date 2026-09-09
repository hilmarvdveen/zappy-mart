import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import { money, openInMemoryDatabase, systemClock, zeroMoney } from "@zappy/shared";
import { createOrderingTables } from "../src/adapters/persistence/orderingTables.js";
import { sqlOrderRepository } from "../src/adapters/persistence/sqlOrderRepository.js";
import { sqlOutboxStore } from "../src/adapters/persistence/sqlOutboxStore.js";
import { idempotentPlaceOrder, inFlightCheckouts } from "../src/application/idempotentPlaceOrder.js";
import { outboxPublisher } from "../src/application/outboxPublisher.js";
import { placeOrder, type PlaceOrder } from "../src/application/placeOrder.js";
import { stockReservationSaga } from "../src/application/stockReservationSaga.js";
import type {
  CartToOrderReader,
  OrderPlacedConsumers,
  OrderRepository,
  StockReservationAnswer,
  StockReserver
} from "../src/application/ports.js";
import type { OrderableCart } from "../src/domain/order.js";

let database: Database;
let orderStore: OrderRepository;
let checkoutsStarted: number;

const orderableCart: OrderableCart = {
  cartId: "cart-01",
  lines: [{ productId: "product-18", productName: "Boat Neck", unitPrice: money(985), quantity: 2 }],
  subtotal: money(1970),
  promotionCode: null,
  discount: zeroMoney,
  shipping: money(495),
  total: money(2465)
};

const cartReader: CartToOrderReader = {
  async readOrderableCart(): Promise<OrderableCart | null> {
    return orderableCart;
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

const silentConsumers: OrderPlacedConsumers = {
  async emptyCart(): Promise<void> {
    return undefined;
  },
  async clearCartPromotion(): Promise<void> {
    return undefined;
  },
  async countPromotionUse(): Promise<void> {
    return undefined;
  },
  async sendConfirmation(): Promise<void> {
    return undefined;
  }
};

function countingCheckout(): PlaceOrder {
  const outbox = sqlOutboxStore(database);
  const inner = placeOrder(
    database,
    orderStore,
    outbox,
    cartReader,
    stockReservationSaga(stockReserver),
    outboxPublisher(outbox, silentConsumers, () => systemClock.now()),
    () => systemClock.now()
  );
  const counted: PlaceOrder = {
    async place(customerId, idempotencyKey) {
      checkoutsStarted = checkoutsStarted + 1;
      return inner.place(customerId, idempotencyKey);
    }
  };
  return idempotentPlaceOrder(counted, orderStore, inFlightCheckouts());
}

before(async () => {
  database = openInMemoryDatabase();
  await createOrderingTables(database);
  orderStore = sqlOrderRepository(database);
});

beforeEach(async () => {
  await orderStore.removeEverything();
  checkoutsStarted = 0;
});

after(async () => {
  await database.close();
});

describe("the idempotency key on placeOrder", () => {
  it("places one order for a double click and answers the same order twice", async () => {
    const checkout = countingCheckout();
    const [first, second] = await Promise.all([
      checkout.place("customer-01", "checkout-double-click"),
      checkout.place("customer-01", "checkout-double-click")
    ]);
    assert.equal(first?.kind, "placed");
    assert.equal(second?.kind, "placed");
    assert.equal(
      first?.kind === "placed" ? first.order.id : "no order",
      second?.kind === "placed" ? second.order.id : "another order"
    );
    assert.equal(checkoutsStarted, 1);
    assert.equal((await orderStore.readAllForCustomerNewestFirst("customer-01")).length, 1);
  });

  it("replays the stored order when the same key comes back much later", async () => {
    const checkout = countingCheckout();
    const first = await checkout.place("customer-01", "checkout-replay");
    const later = await checkout.place("customer-01", "checkout-replay");
    assert.equal(
      first.kind === "placed" ? first.order.number : "no number",
      later.kind === "placed" ? later.order.number : "another number"
    );
    assert.equal(checkoutsStarted, 1);
  });

  it("keeps one customer's key away from another customer's", async () => {
    const checkout = countingCheckout();
    await checkout.place("customer-01", "the same words");
    const other = await checkout.place("customer-02", "the same words");
    assert.equal(other.kind, "placed");
    assert.equal(checkoutsStarted, 2);
    assert.equal((await orderStore.readAllForCustomerNewestFirst("customer-02")).length, 1);
  });

  it("places two orders for two different keys", async () => {
    const checkout = countingCheckout();
    await checkout.place("customer-01", "checkout-one");
    await checkout.place("customer-01", "checkout-two");
    assert.equal(checkoutsStarted, 2);
    assert.equal((await orderStore.readAllForCustomerNewestFirst("customer-01")).length, 2);
  });

  it("hands a call without a key straight to the checkout", async () => {
    const checkout = countingCheckout();
    await checkout.place("customer-01", null);
    await checkout.place("customer-01", null);
    assert.equal(checkoutsStarted, 2);
    assert.equal((await orderStore.readAllForCustomerNewestFirst("customer-01")).length, 2);
  });

  it("forgets a key that failed, so the visitor can try again", async () => {
    const failingOrders: OrderRepository = {
      ...orderStore,
      async write(): Promise<void> {
        throw new Error("the database said no");
      }
    };
    const outbox = sqlOutboxStore(database);
    const checkout = idempotentPlaceOrder(
      placeOrder(
        database,
        failingOrders,
        outbox,
        cartReader,
        stockReservationSaga(stockReserver),
        outboxPublisher(outbox, silentConsumers, () => systemClock.now()),
        () => systemClock.now()
      ),
      orderStore,
      inFlightCheckouts()
    );
    await assert.rejects(checkout.place("customer-01", "checkout-that-fails"));
    await assert.rejects(checkout.place("customer-01", "checkout-that-fails"));
  });
});
