import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { stockReservationSaga } from "../src/application/stockReservationSaga.js";
import type { StockReservationAnswer, StockReserver } from "../src/application/ports.js";

let reservation: StockReservationAnswer;
let reserved: string[];
let released: string[];
let releaseFails: boolean;

const stock: StockReserver = {
  async reserve(idempotencyKey: string): Promise<StockReservationAnswer> {
    reserved.push(idempotencyKey);
    return reservation;
  },
  async release(idempotencyKey: string): Promise<boolean> {
    if (releaseFails) {
      throw new Error("the catalogue is down as well");
    }
    released.push(idempotencyKey);
    return true;
  }
};

const oneLine = [{ productId: "product-18", quantity: 2 }];

beforeEach(() => {
  reservation = { reserved: true, unavailableProductId: null, availableStock: null };
  reserved = [];
  released = [];
  releaseFails = false;
});

describe("the stock reservation saga", () => {
  it("reserves first and then runs the step that follows", async () => {
    const order: string[] = [];
    const saga = stockReservationSaga({
      async reserve(idempotencyKey: string): Promise<StockReservationAnswer> {
        order.push("reserve");
        reserved.push(idempotencyKey);
        return reservation;
      },
      async release(): Promise<boolean> {
        return true;
      }
    });
    const outcome = await saga.withReservedStock("checkout-01", oneLine, async () => {
      order.push("write the order");
      return "order-01";
    });
    assert.deepEqual(order, ["reserve", "write the order"]);
    assert.deepEqual(reserved, ["checkout-01"]);
    assert.deepEqual(outcome, { kind: "completed", value: "order-01" });
  });

  it("does not run the second step when the stock is not there, and names the product", async () => {
    reservation = { reserved: false, unavailableProductId: "product-18", availableStock: 1 };
    let ran = false;
    const outcome = await stockReservationSaga(stock).withReservedStock(
      "checkout-02",
      oneLine,
      async () => {
        ran = true;
        return "never";
      }
    );
    assert.equal(ran, false);
    assert.deepEqual(outcome, { kind: "unavailable", productId: "product-18", availableStock: 1 });
    assert.deepEqual(released, []);
  });

  it("compensates by releasing the reservation when the step that follows fails", async () => {
    await assert.rejects(
      stockReservationSaga(stock).withReservedStock("checkout-03", oneLine, async () => {
        throw new Error("the database said no");
      }),
      /the database said no/
    );
    assert.deepEqual(reserved, ["checkout-03"]);
    assert.deepEqual(released, ["checkout-03"]);
  });

  it("lets the first failure reach the caller even when the compensation fails too", async () => {
    releaseFails = true;
    await assert.rejects(
      stockReservationSaga(stock).withReservedStock("checkout-04", oneLine, async () => {
        throw new Error("the database said no");
      }),
      /the database said no/
    );
    assert.deepEqual(released, []);
  });

  it("releases under the same key it reserved with, so the release is idempotent as well", async () => {
    await assert.rejects(
      stockReservationSaga(stock).withReservedStock("checkout-05", oneLine, async () => {
        throw new Error("no");
      })
    );
    assert.deepEqual(reserved, released);
  });
});
