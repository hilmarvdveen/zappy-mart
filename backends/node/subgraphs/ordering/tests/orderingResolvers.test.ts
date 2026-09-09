import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import { money, openInMemoryDatabase, systemClock, zeroMoney } from "@zappy/shared";
import { anonymousContext, buildTestSchema, runOperation, signedInContext } from "@zappy/shared/testing";
import { createOrderingTables } from "../src/adapters/persistence/orderingTables.js";
import { sqlOrderRepository } from "../src/adapters/persistence/sqlOrderRepository.js";
import { sqlOutboxStore } from "../src/adapters/persistence/sqlOutboxStore.js";
import { placeOrder } from "../src/application/placeOrder.js";
import { readOrders } from "../src/application/readOrders.js";
import type {
  CartToOrderReader,
  OrderPlacedConsumers,
  OrderRepository,
  OutboxStore,
  StockReservationAnswer,
  StockReserver
} from "../src/application/ports.js";
import type { OrderableCart } from "../src/domain/order.js";
import { orderingResolvers } from "../src/adapters/graphql/resolvers.js";
import type { OrderingContext } from "../src/adapters/graphql/context.js";

const orderPayloadFields = `
  order {
    id number status promotionCode placedAt
    lines { productName unitPrice { amount } quantity lineTotal { amount } }
    subtotal { amount } discount { amount } shipping { amount } total { amount }
  }
  errors { code message }
`;

let database: Database;
let orderStore: OrderRepository;
let outbox: OutboxStore;
let context: OrderingContext;
let currentCart: OrderableCart | null;
let reservation: StockReservationAnswer;
let released: string[];
let announced: string[];

const schema = buildTestSchema<OrderingContext>("ordering", orderingResolvers);

const cartReader: CartToOrderReader = {
  async readOrderableCart(): Promise<OrderableCart | null> {
    return currentCart;
  }
};

const stockReserver: StockReserver = {
  async reserve(): Promise<StockReservationAnswer> {
    return reservation;
  },
  async release(idempotencyKey: string): Promise<boolean> {
    released.push(idempotencyKey);
    return true;
  }
};

const consumers: OrderPlacedConsumers = {
  async emptyCart(cartId: string): Promise<void> {
    announced.push(`emptyCart:${cartId}`);
  },
  async clearCartPromotion(cartId: string): Promise<void> {
    announced.push(`clearCartPromotion:${cartId}`);
  },
  async countPromotionUse(code: string): Promise<void> {
    announced.push(`countPromotionUse:${code}`);
  },
  async sendConfirmation(): Promise<void> {
    announced.push("sendConfirmation");
  }
};

function fullCart(): OrderableCart {
  return {
    cartId: "cart-01",
    lines: [{ productId: "product-18", productName: "Boat Neck", unitPrice: money(985), quantity: 2 }],
    subtotal: money(1970),
    promotionCode: null,
    discount: zeroMoney,
    shipping: money(495),
    total: money(2465)
  };
}

before(async () => {
  database = openInMemoryDatabase();
  await createOrderingTables(database);
  orderStore = sqlOrderRepository(database);
  outbox = sqlOutboxStore(database);
});

beforeEach(async () => {
  await orderStore.removeEverything();
  currentCart = fullCart();
  reservation = { reserved: true, unavailableProductId: null, availableStock: null };
  released = [];
  announced = [];
  context = {
    ...signedInContext("customer-01", "session-01"),
    orderStore,
    orders: readOrders(orderStore),
    checkout: placeOrder(
      database,
      orderStore,
      outbox,
      cartReader,
      stockReserver,
      consumers,
      () => systemClock.now()
    ),
    async resetOwnData(): Promise<void> {
      await orderStore.removeEverything();
    }
  };
});

after(async () => {
  await database.close();
});

describe("the ordering subgraph", () => {
  it("places an order and copies the amounts the cart showed", async () => {
    const answer = await runOperation(
      schema,
      `mutation Place($idempotencyKey: String) { placeOrder(idempotencyKey: $idempotencyKey) { ${orderPayloadFields} } }`,
      { idempotencyKey: "checkout-one" },
      context
    );
    const payload = answer.data?.["placeOrder"] as {
      order: {
        number: string;
        status: string;
        lines: readonly { productName: string; lineTotal: { amount: number } }[];
        subtotal: { amount: number };
        shipping: { amount: number };
        total: { amount: number };
      };
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.order.number, "ZM-000001");
    assert.equal(payload.order.status, "PAID");
    assert.equal(payload.order.lines[0]?.lineTotal.amount, 1970);
    assert.equal(payload.order.subtotal.amount, 1970);
    assert.equal(payload.order.shipping.amount, 495);
    assert.equal(payload.order.total.amount, 2465);
  });

  it("writes one outbox row for the order it placed", async () => {
    await runOperation(
      schema,
      `mutation { placeOrder(idempotencyKey: "checkout-outbox") { ${orderPayloadFields} } }`,
      {},
      context
    );
    const waiting = await outbox.readUnpublished();
    assert.equal(waiting.length, 1);
    assert.equal(waiting[0]?.cartId, "cart-01");
    assert.deepEqual(waiting[0]?.reservedLines, [{ productId: "product-18", quantity: 2 }]);
  });

  it("tells the cart and the promotions subgraph after the commit", async () => {
    currentCart = { ...fullCart(), promotionCode: "WELCOME10", discount: money(197), total: money(2268) };
    await runOperation(
      schema,
      `mutation { placeOrder(idempotencyKey: "checkout-announce") { ${orderPayloadFields} } }`,
      {},
      context
    );
    assert.deepEqual(announced, [
      "emptyCart:cart-01",
      "clearCartPromotion:cart-01",
      "countPromotionUse:WELCOME10",
      "sendConfirmation"
    ]);
  });

  it("answers the order it already placed when the same idempotency key comes back", async () => {
    const document = `mutation Place($idempotencyKey: String) { placeOrder(idempotencyKey: $idempotencyKey) { ${orderPayloadFields} } }`;
    const first = await runOperation(schema, document, { idempotencyKey: "checkout-repeat" }, context);
    const second = await runOperation(schema, document, { idempotencyKey: "checkout-repeat" }, context);
    const firstOrder = (first.data?.["placeOrder"] as { order: { id: string } }).order;
    const secondOrder = (second.data?.["placeOrder"] as { order: { id: string } }).order;
    assert.equal(secondOrder.id, firstOrder.id);
    assert.equal((await outbox.readUnpublished()).length, 1);
  });

  it("refuses without a signed in customer", async () => {
    const answer = await runOperation(
      schema,
      `mutation { placeOrder(idempotencyKey: "checkout-anonymous") { ${orderPayloadFields} } }`,
      {},
      { ...context, ...anonymousContext() }
    );
    const payload = answer.data?.["placeOrder"] as {
      order: unknown;
      errors: readonly { code: string }[];
    };
    assert.equal(payload.order, null);
    assert.equal(payload.errors[0]?.code, "NOT_AUTHENTICATED");
  });

  it("refuses an empty cart", async () => {
    currentCart = null;
    const answer = await runOperation(
      schema,
      `mutation { placeOrder(idempotencyKey: "checkout-empty") { ${orderPayloadFields} } }`,
      {},
      context
    );
    assert.equal(
      (answer.data?.["placeOrder"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "CART_EMPTY"
    );
  });

  it("refuses when the stock cannot be reserved and names the product", async () => {
    reservation = { reserved: false, unavailableProductId: "product-18", availableStock: 1 };
    const answer = await runOperation(
      schema,
      `mutation { placeOrder(idempotencyKey: "checkout-stock") { ${orderPayloadFields} } }`,
      {},
      context
    );
    const payload = answer.data?.["placeOrder"] as {
      order: unknown;
      errors: readonly { code: string; message: string }[];
    };
    assert.equal(payload.order, null);
    assert.equal(payload.errors[0]?.code, "OUT_OF_STOCK");
    assert.match(payload.errors[0]?.message ?? "", /Boat Neck/);
    assert.equal((await outbox.readUnpublished()).length, 0);
  });

  it("pages the customer's orders newest first and answers nothing to a stranger", async () => {
    for (const key of ["checkout-one", "checkout-two", "checkout-three"]) {
      await runOperation(
        schema,
        `mutation Place($idempotencyKey: String) { placeOrder(idempotencyKey: $idempotencyKey) { ${orderPayloadFields} } }`,
        { idempotencyKey: key },
        context
      );
    }
    const listed = await runOperation(
      schema,
      "{ orders(first: 2) { totalCount pageInfo { hasNextPage } edges { node { number } } } }",
      {},
      context
    );
    const orders = listed.data?.["orders"] as {
      totalCount: number;
      pageInfo: { hasNextPage: boolean };
      edges: readonly { node: { number: string } }[];
    };
    assert.equal(orders.totalCount, 3);
    assert.equal(orders.pageInfo.hasNextPage, true);
    assert.deepEqual(orders.edges.map((edge) => edge.node.number), ["ZM-000003", "ZM-000002"]);

    const stranger = await runOperation(
      schema,
      "{ orders(first: 5) { totalCount } }",
      {},
      { ...context, ...signedInContext("customer-99", "session-99") }
    );
    assert.equal((stranger.data?.["orders"] as { totalCount: number }).totalCount, 0);
  });

  it("answers one order by its id and null for an order of somebody else", async () => {
    const placed = await runOperation(
      schema,
      `mutation { placeOrder(idempotencyKey: "checkout-single") { ${orderPayloadFields} } }`,
      {},
      context
    );
    const orderId = (placed.data?.["placeOrder"] as { order: { id: string } }).order.id;

    const mine = await runOperation(
      schema,
      "query One($id: ID!) { order(id: $id) { number } }",
      { id: orderId },
      context
    );
    assert.equal((mine.data?.["order"] as { number: string }).number, "ZM-000001");

    const theirs = await runOperation(
      schema,
      "query One($id: ID!) { order(id: $id) { number } }",
      { id: orderId },
      { ...context, ...signedInContext("customer-99", "session-99") }
    );
    assert.equal(theirs.data?.["order"], null);
  });

  it("gives the stock back when the order cannot be written", async () => {
    const failingOrders: OrderRepository = {
      ...orderStore,
      async write(): Promise<void> {
        throw new Error("the database said no");
      }
    };
    const failingContext: OrderingContext = {
      ...context,
      checkout: placeOrder(
        database,
        failingOrders,
        outbox,
        cartReader,
        stockReserver,
        consumers,
        () => systemClock.now()
      )
    };
    const answer = await runOperation(
      schema,
      `mutation { placeOrder(idempotencyKey: "checkout-fails") { ${orderPayloadFields} } }`,
      {},
      failingContext
    );
    assert.equal(answer.errorMessages.length, 1);
    assert.deepEqual(released, ["checkout-fails"]);
    assert.equal((await outbox.readUnpublished()).length, 0);
  });
});
