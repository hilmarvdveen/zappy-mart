import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { money } from "@zappy/shared";
import type { Cart } from "../src/domain/cart.js";
import {
  emptyCart,
  isQuantityValid,
  lineById,
  lineForProduct,
  priceLines,
  quantityAfterAdding,
  subtotalOf,
  withEveryLineRemoved,
  withLineQuantityChanged,
  withLineRemoved,
  withProductAdded
} from "../src/domain/cart.js";
import { ownerKeyOf } from "../src/application/changeCart.js";

const moment = "2026-09-09T12:00:00Z";

function cartWithOneLine(): Cart {
  return withProductAdded(
    emptyCart("cart-01", "visitor:one", moment),
    "line-01",
    "product-18",
    2,
    moment
  );
}

describe("a cart and its lines", () => {
  it("starts empty and adds the first line", () => {
    const cart = cartWithOneLine();
    assert.equal(cart.lines.length, 1);
    assert.equal(cart.lines[0]?.quantity, 2);
    assert.equal(lineForProduct(cart, "product-18")?.id, "line-01");
    assert.equal(lineById(cart, "line-01")?.productId, "product-18");
  });

  it("raises the quantity when the same product is added again", () => {
    const cart = withProductAdded(cartWithOneLine(), "line-02", "product-18", 3, moment);
    assert.equal(cart.lines.length, 1);
    assert.equal(cart.lines[0]?.quantity, 5);
  });

  it("keeps the order in which products were first added", () => {
    const cart = withProductAdded(cartWithOneLine(), "line-02", "product-01", 1, moment);
    assert.deepEqual(cart.lines.map((line) => line.productId), ["product-18", "product-01"]);
  });

  it("says what the quantity would become before it changes anything", () => {
    assert.equal(quantityAfterAdding(cartWithOneLine(), "product-18", 3), 5);
    assert.equal(quantityAfterAdding(cartWithOneLine(), "product-01", 3), 3);
  });

  it("sets a line to an exact quantity and removes a line", () => {
    const changed = withLineQuantityChanged(cartWithOneLine(), "line-01", 7, moment);
    assert.equal(changed.lines[0]?.quantity, 7);
    assert.deepEqual(withLineRemoved(changed, "line-01", moment).lines, []);
    assert.deepEqual(withEveryLineRemoved(changed, moment).lines, []);
  });

  it("accepts a whole quantity of one or more and nothing else", () => {
    assert.equal(isQuantityValid(1), true);
    assert.equal(isQuantityValid(0), false);
    assert.equal(isQuantityValid(-2), false);
    assert.equal(isQuantityValid(1.5), false);
  });

  it("works out the line totals and the subtotal from the prices of the moment", () => {
    const cart = withProductAdded(cartWithOneLine(), "line-02", "product-19", 1, moment);
    const priced = priceLines(cart, (productId) =>
      productId === "product-18" ? money(985) : money(795)
    );
    assert.deepEqual(priced.map((line) => line.lineTotal.amount), [1970, 795]);
    assert.equal(subtotalOf(priced).amount, 2765);
  });

  it("prices a line the catalogue does not know at nothing", () => {
    const priced = priceLines(cartWithOneLine(), () => null);
    assert.equal(priced[0]?.lineTotal.amount, 0);
    assert.equal(subtotalOf(priced).amount, 0);
  });

  it("charges an empty cart nothing at all", () => {
    assert.equal(subtotalOf(priceLines(emptyCart("cart-02", "visitor:two", moment), () => money(100))).amount, 0);
  });
});

describe("who a cart belongs to", () => {
  it("belongs to the customer when one is signed in", () => {
    assert.equal(ownerKeyOf({ customerId: "customer-01", visitorKey: "abc" }), "customer:customer-01");
  });

  it("belongs to the visitor key from the cookie otherwise", () => {
    assert.equal(ownerKeyOf({ customerId: null, visitorKey: "abc" }), "visitor:abc");
  });

  it("has one shared owner for a visitor with neither", () => {
    assert.equal(ownerKeyOf({ customerId: null, visitorKey: null }), "visitor:unknown");
  });
});
