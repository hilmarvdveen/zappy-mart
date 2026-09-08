import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { createStore, loadSeed } from "../state.mjs";
import { hashPassword } from "../accounts.mjs";
import { addProductToCart, applyPromotionCodeToCart, openCartForVisitor } from "../cart.mjs";
import { findProductById } from "../catalogue.mjs";
import { findPromotionCode } from "../promotions.mjs";
import { ordersOfCustomer, placeOrderFromCart } from "../ordering.mjs";

const now = new Date("2026-09-09T12:00:00Z");
const customerVisitor = { customerId: "customer-01", sessionId: null, anonymousCartId: null };

describe("placing an order", () => {
  const store = createStore();
  let cart = null;

  beforeEach(async () => {
    await loadSeed(store, hashPassword);
    cart = openCartForVisitor(store, customerVisitor, now);
  });

  test("refuses a cart with no lines", () => {
    const outcome = placeOrderFromCart(store, cart, "customer-01", now);
    assert.equal(outcome.order, null);
    assert.equal(outcome.errors[0].code, "CART_EMPTY");
  });

  test("keeps the names, the prices and the totals of the moment", () => {
    addProductToCart(store, cart, "product-18", 2, now);
    applyPromotionCodeToCart(store, cart, "WELCOME10", now);

    const { order, errors } = placeOrderFromCart(store, cart, "customer-01", now);

    assert.deepEqual(errors, []);
    assert.equal(order.status, "PAID");
    assert.equal(order.number, "ZM-100001");
    assert.equal(order.promotionCode, "WELCOME10");
    assert.deepEqual(order.lines, [
      {
        productName: "MBJ Women's Solid Short Sleeve Boat Neck V",
        unitPrice: { amount: 985, currency: "EUR" },
        quantity: 2,
        lineTotal: { amount: 1970, currency: "EUR" }
      }
    ]);
    assert.deepEqual(order.subtotal, { amount: 1970, currency: "EUR" });
    assert.deepEqual(order.discount, { amount: 197, currency: "EUR" });
    assert.deepEqual(order.shipping, { amount: 495, currency: "EUR" });
    assert.deepEqual(order.total, { amount: 2268, currency: "EUR" });
    assert.equal(order.placedAt, now);
  });

  test("does not follow a later price change", () => {
    addProductToCart(store, cart, "product-18", 1, now);
    const { order } = placeOrderFromCart(store, cart, "customer-01", now);
    findProductById(store, "product-18").price.amount = 1;
    assert.deepEqual(order.lines[0].unitPrice, { amount: 985, currency: "EUR" });
  });

  test("reserves the stock and empties the cart", () => {
    addProductToCart(store, cart, "product-12", 1, now);
    placeOrderFromCart(store, cart, "customer-01", now);

    assert.equal(findProductById(store, "product-12").stock, 0);
    assert.deepEqual(cart.lines, []);
    assert.equal(cart.promotionCode, null);
  });

  test("reserves all the lines or none of them", () => {
    addProductToCart(store, cart, "product-12", 1, now);
    addProductToCart(store, cart, "product-18", 2, now);
    findProductById(store, "product-12").stock = 0;

    const outcome = placeOrderFromCart(store, cart, "customer-01", now);

    assert.equal(outcome.order, null);
    assert.equal(outcome.errors[0].code, "OUT_OF_STOCK");
    assert.ok(outcome.errors[0].message.includes("WD 4TB Gaming Drive"));
    assert.equal(findProductById(store, "product-18").stock, 25);
    assert.equal(cart.lines.length, 2);
    assert.equal(store.orders.length, 0);
  });

  test("raises the recorded uses of the code it was placed with", () => {
    addProductToCart(store, cart, "product-18", 2, now);
    applyPromotionCodeToCart(store, cart, "WELCOME10", now);
    placeOrderFromCart(store, cart, "customer-01", now);

    assert.equal(findPromotionCode(store, "WELCOME10").timesUsed, 1);
  });

  test("answers a second attempt on the emptied cart with CART_EMPTY", () => {
    addProductToCart(store, cart, "product-18", 1, now);
    placeOrderFromCart(store, cart, "customer-01", now);

    assert.equal(placeOrderFromCart(store, cart, "customer-01", now).errors[0].code, "CART_EMPTY");
  });

  test("numbers the orders and lists them newest first", () => {
    addProductToCart(store, cart, "product-18", 1, now);
    placeOrderFromCart(store, cart, "customer-01", now);
    addProductToCart(store, cart, "product-19", 1, now);
    placeOrderFromCart(store, cart, "customer-01", now);

    assert.deepEqual(
      ordersOfCustomer(store, "customer-01").map((order) => order.number),
      ["ZM-100002", "ZM-100001"]
    );
    assert.deepEqual(ordersOfCustomer(store, "customer-99"), []);
  });
});
