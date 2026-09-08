import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { createStore, loadSeed } from "../state.mjs";
import { hashPassword } from "../accounts.mjs";
import {
  createPage,
  encodeCursor,
  findProductById,
  findProductBySlug,
  maximumPageSize,
  presentProduct,
  selectProducts
} from "../catalogue.mjs";

describe("the catalogue", () => {
  const store = createStore();

  before(async () => {
    await loadSeed(store, hashPassword);
  });

  test("loads the twenty seed products in catalogue order", () => {
    assert.equal(store.products.length, 20);
    assert.equal(store.products[0].id, "product-01");
    assert.equal(store.products[19].id, "product-20");
  });

  test("finds a product by its id and by its slug", () => {
    assert.equal(findProductById(store, "product-03").slug, "mens-cotton-jacket");
    assert.equal(findProductBySlug(store, "mens-cotton-jacket").id, "product-03");
    assert.equal(findProductBySlug(store, "no-such-product"), null);
  });

  test("presents a product with its category rather than its category slug", () => {
    const presented = presentProduct(store, findProductById(store, "product-03"));
    assert.deepEqual(presented.category, { id: "category-mens-clothing", name: "Men's clothing", slug: "mens-clothing" });
    assert.deepEqual(presented.price, { amount: 5599, currency: "EUR" });
    assert.equal(presented.imageUrl, "/images/products/mens-cotton-jacket.svg");
  });

  test("shows a product with no stock and keeps it out of the in stock filter", () => {
    assert.equal(findProductById(store, "product-07").stock, 0);
    assert.equal(selectProducts(store, null).length, 20);
    assert.equal(selectProducts(store, { inStockOnly: true }).length, 19);
    assert.ok(!selectProducts(store, { inStockOnly: true }).some((product) => product.id === "product-07"));
  });

  test("narrows the catalogue by category", () => {
    const jewellery = selectProducts(store, { categorySlug: "jewellery" });
    assert.deepEqual(
      jewellery.map((product) => product.id),
      ["product-05", "product-06", "product-07", "product-08"]
    );
  });

  test("narrows the catalogue by name without regard to case", () => {
    const found = selectProducts(store, { nameContains: "JACKET" });
    assert.deepEqual(
      found.map((product) => product.id),
      ["product-03", "product-15", "product-16", "product-17"]
    );
  });

  test("holds every given filter part at once", () => {
    const found = selectProducts(store, { categorySlug: "womens-clothing", nameContains: "jacket", inStockOnly: true });
    assert.deepEqual(
      found.map((product) => product.id),
      ["product-15", "product-16", "product-17"]
    );
  });

  test("pages forward through the catalogue with cursors", () => {
    const identity = (product) => product;
    const firstPage = createPage(store.products, {
      first: 3,
      defaultSize: 24,
      after: null,
      cursorPrefix: "product",
      present: identity
    });

    assert.equal(firstPage.totalCount, 20);
    assert.equal(firstPage.edges.length, 3);
    assert.equal(firstPage.pageInfo.hasNextPage, true);
    assert.equal(firstPage.pageInfo.endCursor, encodeCursor("product", "product-03"));

    const secondPage = createPage(store.products, {
      first: 3,
      defaultSize: 24,
      after: firstPage.pageInfo.endCursor,
      cursorPrefix: "product",
      present: identity
    });
    assert.deepEqual(
      secondPage.edges.map((edge) => edge.node.id),
      ["product-04", "product-05", "product-06"]
    );
  });

  test("reports the last page as having no page after it", () => {
    const page = createPage(store.products, {
      first: 100,
      defaultSize: 24,
      after: null,
      cursorPrefix: "product",
      present: (product) => product
    });
    assert.equal(page.edges.length, 20);
    assert.equal(page.pageInfo.hasNextPage, false);
    assert.equal(page.pageInfo.endCursor, encodeCursor("product", "product-20"));
  });

  test("answers a page larger than the cap with the cap rather than refusing it", () => {
    const many = Array.from({ length: 250 }, (unusedValue, position) => ({ id: `item-${position}` }));
    const page = createPage(many, {
      first: 500,
      defaultSize: 24,
      after: null,
      cursorPrefix: "item",
      present: (item) => item
    });
    assert.equal(page.edges.length, maximumPageSize);
    assert.equal(page.totalCount, 250);
  });

  test("answers an empty page for a cursor that is not in the list", () => {
    const page = createPage(store.products, {
      first: 3,
      defaultSize: 24,
      after: encodeCursor("product", "product-99"),
      cursorPrefix: "product",
      present: (product) => product
    });
    assert.deepEqual(page.edges, []);
    assert.equal(page.pageInfo.endCursor, null);
    assert.equal(page.pageInfo.hasNextPage, false);
  });
});
