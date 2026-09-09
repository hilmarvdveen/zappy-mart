import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { money } from "@zappy/shared";
import type { Product } from "../src/domain/product.js";
import { hasStockFor, withStockRaisedBy, withStockReducedBy } from "../src/domain/product.js";
import { specificationFor } from "../src/domain/productSpecification.js";
import { reserveAllOrNothing } from "../src/domain/stockReservation.js";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-01",
    name: "Mens Cotton Jacket",
    slug: "mens-cotton-jacket",
    description: "A jacket",
    price: money(5599),
    categorySlug: "mens-clothing",
    stock: 8,
    imageUrl: null,
    ...overrides
  };
}

describe("a product and its stock", () => {
  it("has stock for a quantity up to what is left", () => {
    assert.equal(hasStockFor(product({ stock: 2 }), 2), true);
    assert.equal(hasStockFor(product({ stock: 2 }), 3), false);
  });

  it("has stock for nothing when the quantity is zero or less", () => {
    assert.equal(hasStockFor(product({ stock: 5 }), 0), false);
    assert.equal(hasStockFor(product({ stock: 5 }), -1), false);
  });

  it("lowers and raises the stock without touching the rest", () => {
    assert.equal(withStockReducedBy(product({ stock: 5 }), 3).stock, 2);
    assert.equal(withStockRaisedBy(product({ stock: 5 }), 3).stock, 8);
  });

  it("refuses to give more than it has", () => {
    assert.throws(() => withStockReducedBy(product({ stock: 1 }), 2));
  });
});

describe("the catalogue filter", () => {
  const catalogue = [
    product({ id: "product-01", name: "Cotton Jacket", categorySlug: "mens-clothing", stock: 8 }),
    product({ id: "product-07", name: "Princess Ring", categorySlug: "jewellery", stock: 0 }),
    product({ id: "product-13", name: "Acer Monitor", categorySlug: "electronics", stock: 4 })
  ];

  it("keeps every product when no filter is given", () => {
    assert.equal(catalogue.filter(specificationFor(null)).length, 3);
  });

  it("keeps the products of one category", () => {
    const kept = catalogue.filter(specificationFor({ categorySlug: "jewellery" }));
    assert.deepEqual(kept.map((entry) => entry.id), ["product-07"]);
  });

  it("compares the name without regard to case", () => {
    const kept = catalogue.filter(specificationFor({ nameContains: "MONITOR" }));
    assert.deepEqual(kept.map((entry) => entry.id), ["product-13"]);
  });

  it("leaves the product without stock out when the filter asks for stock only", () => {
    const kept = catalogue.filter(specificationFor({ inStockOnly: true }));
    assert.deepEqual(kept.map((entry) => entry.id), ["product-01", "product-13"]);
  });

  it("holds every part that is given at once", () => {
    const kept = catalogue.filter(
      specificationFor({ categorySlug: "jewellery", inStockOnly: true })
    );
    assert.deepEqual(kept, []);
  });
});

describe("reserving stock for an order", () => {
  const stocked = new Map([
    ["product-01", product({ id: "product-01", stock: 8 })],
    ["product-12", product({ id: "product-12", stock: 1 })]
  ]);

  it("reserves every line or none of them", () => {
    const outcome = reserveAllOrNothing(stocked, [
      { productId: "product-01", quantity: 2 },
      { productId: "product-12", quantity: 1 }
    ]);
    assert.equal(outcome.kind, "reserved");
    if (outcome.kind === "reserved") {
      assert.deepEqual(outcome.reduced.map((entry) => entry.stock), [6, 0]);
    }
  });

  it("names the product that cannot be reserved and how many are left", () => {
    const outcome = reserveAllOrNothing(stocked, [
      { productId: "product-01", quantity: 1 },
      { productId: "product-12", quantity: 2 }
    ]);
    assert.equal(outcome.kind, "unavailable");
    if (outcome.kind === "unavailable") {
      assert.equal(outcome.productId, "product-12");
      assert.equal(outcome.availableStock, 1);
    }
  });

  it("names a product the catalogue does not have", () => {
    const outcome = reserveAllOrNothing(stocked, [{ productId: "product-99", quantity: 1 }]);
    assert.equal(outcome.kind, "unavailable");
    if (outcome.kind === "unavailable") {
      assert.equal(outcome.productId, "product-99");
      assert.equal(outcome.availableStock, 0);
    }
  });
});
