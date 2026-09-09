import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { money, zeroMoney } from "@zappy/shared";
import type { OrderableCart } from "../src/domain/order.js";
import { orderLinesFrom, placeOrderFrom, subtotalOfLines } from "../src/domain/order.js";
import { orderPlaced, orderPlacedEventName } from "../src/domain/orderPlaced.js";

const placedAt = "2026-09-09T12:00:00Z";

function cart(overrides: Partial<OrderableCart> = {}): OrderableCart {
  return {
    cartId: "cart-01",
    lines: [
      { productId: "product-18", productName: "Boat Neck", unitPrice: money(985), quantity: 2 },
      { productId: "product-19", productName: "Short Sleeve", unitPrice: money(795), quantity: 1 }
    ],
    subtotal: money(2765),
    promotionCode: null,
    discount: zeroMoney,
    shipping: money(495),
    total: money(3260),
    ...overrides
  };
}

describe("placing an order from a cart", () => {
  it("copies the names and the prices of the moment onto the lines", () => {
    const lines = orderLinesFrom(cart());
    assert.deepEqual(
      lines.map((line) => ({ name: line.productName, total: line.lineTotal.amount })),
      [
        { name: "Boat Neck", total: 1970 },
        { name: "Short Sleeve", total: 795 }
      ]
    );
    assert.equal(subtotalOfLines(lines).amount, 2765);
  });

  it("is placed as paid with a readable number", () => {
    const order = placeOrderFrom("order-01", 1, "customer-01", cart(), placedAt);
    assert.equal(order.status, "PAID");
    assert.equal(order.number, "ZM-000001");
    assert.equal(order.placedAt, placedAt);
    assert.equal(order.customerId, "customer-01");
  });

  it("keeps the equation total is subtotal plus shipping minus discount", () => {
    const order = placeOrderFrom("order-01", 1, "customer-01", cart(), placedAt);
    assert.equal(order.subtotal.amount, 2765);
    assert.equal(order.shipping.amount, 495);
    assert.equal(order.discount.amount, 0);
    assert.equal(order.total.amount, 3260);
  });

  it("carries a promotion code and its discount onto the order", () => {
    const withCode = cart({
      promotionCode: "WELCOME10",
      discount: money(277),
      shipping: money(495),
      total: money(2983)
    });
    const order = placeOrderFrom("order-01", 2, "customer-01", withCode, placedAt);
    assert.equal(order.promotionCode, "WELCOME10");
    assert.equal(order.discount.amount, 277);
    assert.equal(order.total.amount, 2983);
    assert.equal(order.number, "ZM-000002");
  });

  it("refuses to be placed from a cart with no lines", () => {
    assert.throws(() => placeOrderFrom("order-01", 1, "customer-01", cart({ lines: [] }), placedAt));
  });
});

describe("the OrderPlaced event", () => {
  it("names the order, the cart and every reserved line", () => {
    const order = placeOrderFrom("order-01", 1, "customer-01", cart(), placedAt);
    const event = orderPlaced(order, "cart-01");
    assert.equal(event.name, orderPlacedEventName);
    assert.equal(event.orderNumber, "ZM-000001");
    assert.equal(event.cartId, "cart-01");
    assert.equal(event.customerId, "customer-01");
    assert.deepEqual(event.reservedLines, [
      { productId: "product-18", quantity: 2 },
      { productId: "product-19", quantity: 1 }
    ]);
  });
});
