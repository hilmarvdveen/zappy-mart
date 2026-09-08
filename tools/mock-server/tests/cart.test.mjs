import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { createStore, loadSeed } from "../state.mjs";
import { hashPassword } from "../accounts.mjs";
import {
  addProductToCart,
  applyPromotionCodeToCart,
  calculateAmounts,
  changeCartLineQuantity,
  findCartForVisitor,
  freeShippingFromSubtotal,
  mergeAnonymousCartIntoCustomer,
  openCartForVisitor,
  presentCart,
  removeCartLine,
  removePromotionCodeFromCart,
  shippingCharge
} from "../cart.mjs";

const now = new Date("2026-09-09T12:00:00Z");

function anonymousVisitor() {
  return { customerId: null, sessionId: null, anonymousCartId: null };
}

describe("the cart", () => {
  const store = createStore();
  let cart = null;

  beforeEach(async () => {
    await loadSeed(store, hashPassword);
    cart = openCartForVisitor(store, anonymousVisitor(), now);
  });

  test("charges no shipping on an empty cart", () => {
    assert.deepEqual(calculateAmounts(store, cart), {
      promotionCode: null,
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0
    });
  });

  test("charges shipping from the first line onwards", () => {
    addProductToCart(store, cart, "product-18", 1, now);
    assert.equal(calculateAmounts(store, cart).shipping, shippingCharge);
  });

  test("drops the shipping charge again when the last line is removed", () => {
    addProductToCart(store, cart, "product-18", 1, now);
    removeCartLine(store, cart, cart.lines[0].id, now);

    assert.deepEqual(calculateAmounts(store, cart), {
      promotionCode: null,
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0
    });
  });

  test("charges no shipping on an emptied cart that still holds a code", () => {
    addProductToCart(store, cart, "product-18", 3, now);
    applyPromotionCodeToCart(store, cart, "WELCOME10", now);
    removeCartLine(store, cart, cart.lines[0].id, now);

    const amounts = calculateAmounts(store, cart);
    assert.equal(amounts.promotionCode.code, "WELCOME10");
    assert.equal(amounts.subtotal, 0);
    assert.equal(amounts.discount, 0);
    assert.equal(amounts.shipping, 0);
    assert.equal(amounts.total, 0);
  });

  test("adds a product and derives the line total", () => {
    const outcome = addProductToCart(store, cart, "product-18", 2, now);
    assert.deepEqual(outcome.errors, []);

    const presented = presentCart(store, cart);
    assert.equal(presented.lines.length, 1);
    assert.equal(presented.lines[0].quantity, 2);
    assert.deepEqual(presented.lines[0].lineTotal, { amount: 1970, currency: "EUR" });
    assert.deepEqual(presented.subtotal, { amount: 1970, currency: "EUR" });
    assert.deepEqual(presented.shipping, { amount: 495, currency: "EUR" });
    assert.deepEqual(presented.total, { amount: 2465, currency: "EUR" });
  });

  test("raises the quantity when the product is already on a line", () => {
    addProductToCart(store, cart, "product-18", 2, now);
    addProductToCart(store, cart, "product-18", 3, now);
    assert.equal(cart.lines.length, 1);
    assert.equal(cart.lines[0].quantity, 5);
  });

  test("keeps the lines in the order the products were first added", () => {
    addProductToCart(store, cart, "product-18", 1, now);
    addProductToCart(store, cart, "product-01", 1, now);
    addProductToCart(store, cart, "product-18", 1, now);
    assert.deepEqual(
      cart.lines.map((line) => line.productId),
      ["product-18", "product-01"]
    );
  });

  test("refuses an unknown product", () => {
    const outcome = addProductToCart(store, cart, "product-99", 1, now);
    assert.equal(outcome.errors[0].code, "PRODUCT_NOT_FOUND");
    assert.equal(outcome.errors[0].field, "productId");
  });

  test("refuses a quantity below one", () => {
    assert.equal(addProductToCart(store, cart, "product-18", 0, now).errors[0].code, "QUANTITY_INVALID");
    assert.equal(changeCartLineQuantity(store, cart, "line-anything", 0, now).errors[0].code, "QUANTITY_INVALID");
  });

  test("refuses a product with no stock and names how many are available", () => {
    const outcome = addProductToCart(store, cart, "product-07", 1, now);
    assert.equal(outcome.errors[0].code, "OUT_OF_STOCK");
    assert.equal(outcome.availableStock, 0);
  });

  test("refuses the second of a product with one item left", () => {
    assert.deepEqual(addProductToCart(store, cart, "product-12", 1, now).errors, []);
    const outcome = addProductToCart(store, cart, "product-12", 1, now);
    assert.equal(outcome.errors[0].code, "OUT_OF_STOCK");
    assert.equal(outcome.availableStock, 1);
    assert.equal(cart.lines[0].quantity, 1);
  });

  test("sets a line to an exact quantity and refuses one above the stock", () => {
    addProductToCart(store, cart, "product-12", 1, now);
    const lineId = cart.lines[0].id;
    assert.deepEqual(changeCartLineQuantity(store, cart, lineId, 1, now).errors, []);
    const outcome = changeCartLineQuantity(store, cart, lineId, 2, now);
    assert.equal(outcome.errors[0].code, "OUT_OF_STOCK");
    assert.equal(outcome.availableStock, 1);
  });

  test("answers a line that is not in the cart with CART_LINE_NOT_FOUND", () => {
    assert.equal(changeCartLineQuantity(store, cart, "line-gone", 2, now).errors[0].code, "CART_LINE_NOT_FOUND");
    assert.equal(removeCartLine(store, cart, "line-gone", now).errors[0].code, "CART_LINE_NOT_FOUND");
  });

  test("removes a line and answers the second removal with CART_LINE_NOT_FOUND", () => {
    addProductToCart(store, cart, "product-18", 1, now);
    const lineId = cart.lines[0].id;
    assert.deepEqual(removeCartLine(store, cart, lineId, now).errors, []);
    assert.equal(cart.lines.length, 0);
    assert.equal(removeCartLine(store, cart, lineId, now).errors[0].code, "CART_LINE_NOT_FOUND");
  });

  test("drops the shipping charge once the subtotal reaches the free shipping subtotal", () => {
    addProductToCart(store, cart, "product-03", 1, now);
    const amounts = calculateAmounts(store, cart);
    assert.ok(amounts.subtotal >= freeShippingFromSubtotal);
    assert.equal(amounts.shipping, 0);
  });

  test("works the three carts of the seed description", () => {
    addProductToCart(store, cart, "product-18", 2, now);
    assert.deepEqual(calculateAmounts(store, cart), {
      promotionCode: null,
      subtotal: 1970,
      discount: 0,
      shipping: 495,
      total: 2465
    });

    applyPromotionCodeToCart(store, cart, "FREESHIP", now);
    const withFreeShipping = calculateAmounts(store, cart);
    assert.equal(withFreeShipping.subtotal, 1970);
    assert.equal(withFreeShipping.shipping, 0);
    assert.equal(withFreeShipping.discount, 0);
    assert.equal(withFreeShipping.total, 1970);

    const otherCart = openCartForVisitor(store, anonymousVisitor(), now);
    addProductToCart(store, otherCart, "product-03", 1, now);
    applyPromotionCodeToCart(store, otherCart, "WELCOME10", now);
    const withPercentage = calculateAmounts(store, otherCart);
    assert.equal(withPercentage.subtotal, 5599);
    assert.equal(withPercentage.shipping, 0);
    assert.equal(withPercentage.discount, 560);
    assert.equal(withPercentage.total, 5039);
  });

  test("holds one code at a time and lets a second replace the first", () => {
    addProductToCart(store, cart, "product-18", 3, now);
    applyPromotionCodeToCart(store, cart, "WELCOME10", now);
    assert.equal(cart.promotionCode, "WELCOME10");
    applyPromotionCodeToCart(store, cart, "FREESHIP", now);
    assert.equal(cart.promotionCode, "FREESHIP");
  });

  test("keeps the code it had when a second code is refused", () => {
    addProductToCart(store, cart, "product-18", 3, now);
    applyPromotionCodeToCart(store, cart, "WELCOME10", now);
    const outcome = applyPromotionCodeToCart(store, cart, "SUMMER2025", now);
    assert.equal(outcome.errors[0].code, "CODE_EXPIRED");
    assert.equal(cart.promotionCode, "WELCOME10");
  });

  test("removes the code and answers a cart with no code without an error", () => {
    addProductToCart(store, cart, "product-18", 3, now);
    applyPromotionCodeToCart(store, cart, "WELCOME10", now);
    assert.deepEqual(removePromotionCodeFromCart(store, cart, now).errors, []);
    assert.equal(cart.promotionCode, null);
    assert.deepEqual(removePromotionCodeFromCart(store, cart, now).errors, []);
  });

  test("presents the applied promotion with what it takes off", () => {
    addProductToCart(store, cart, "product-18", 2, now);
    applyPromotionCodeToCart(store, cart, "WELCOME10", now);
    assert.deepEqual(presentCart(store, cart).promotion, {
      code: "WELCOME10",
      kind: "PERCENTAGE",
      discount: { amount: 197, currency: "EUR" }
    });
  });

  test("moves an anonymous cart to a customer who has none", () => {
    addProductToCart(store, cart, "product-18", 2, now);
    mergeAnonymousCartIntoCustomer(store, cart.id, "customer-01", now);
    assert.equal(cart.customerId, "customer-01");
    assert.equal(findCartForVisitor(store, { customerId: "customer-01", sessionId: null, anonymousCartId: null }), cart);
  });

  test("merges an anonymous cart into a cart the customer already has", () => {
    const customerCart = openCartForVisitor(
      store,
      { customerId: "customer-01", sessionId: null, anonymousCartId: null },
      now
    );
    addProductToCart(store, customerCart, "product-18", 2, now);
    addProductToCart(store, cart, "product-18", 3, now);
    addProductToCart(store, cart, "product-01", 1, now);

    mergeAnonymousCartIntoCustomer(store, cart.id, "customer-01", now);

    assert.equal(store.carts.includes(cart), false);
    assert.deepEqual(
      customerCart.lines.map((line) => [line.productId, line.quantity]),
      [
        ["product-18", 5],
        ["product-01", 1]
      ]
    );
  });

  test("never merges a quantity above the stock", () => {
    const customerCart = openCartForVisitor(
      store,
      { customerId: "customer-01", sessionId: null, anonymousCartId: null },
      now
    );
    addProductToCart(store, customerCart, "product-12", 1, now);
    addProductToCart(store, cart, "product-12", 1, now);

    mergeAnonymousCartIntoCustomer(store, cart.id, "customer-01", now);

    assert.equal(customerCart.lines[0].quantity, 1);
  });
});
