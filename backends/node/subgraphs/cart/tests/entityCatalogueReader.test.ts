import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  entityCatalogueReader,
  type AskCatalogueForProducts
} from "../src/adapters/catalogue/entityCatalogueReader.js";

const catalogue = [
  { id: "product-18", name: "Boat Neck", price: { amount: 985 }, stock: 40 },
  { id: "product-03", name: "Mens Cotton Jacket", price: { amount: 5599 }, stock: 8 },
  { id: "product-05", name: "Dragon Station Chain Bracelet", price: { amount: 69500 }, stock: 5 }
];

let callsToCatalogue: readonly Readonly<Record<string, unknown>>[][];

const askCatalogue: AskCatalogueForProducts = async (representations) => {
  callsToCatalogue = [...callsToCatalogue, [...representations]];
  const wanted = representations.map((representation) => representation["id"]);
  return { _entities: catalogue.filter((product) => wanted.includes(product.id)) };
};

const noHeaders = { authorization: null, cookie: null };

beforeEach(() => {
  callsToCatalogue = [];
});

describe("the entity reference to the catalogue", () => {
  it("asks the catalogue once for the products of a whole cart", async () => {
    const reader = entityCatalogueReader(noHeaders, askCatalogue);
    const products = await reader.readProducts(["product-18", "product-03", "product-05"]);
    assert.deepEqual(
      products.map((product) => product.name),
      ["Boat Neck", "Mens Cotton Jacket", "Dragon Station Chain Bracelet"]
    );
    assert.equal(callsToCatalogue.length, 1);
    assert.equal(callsToCatalogue[0]?.length, 3);
  });

  it("batches three separate line reads of one request into one call", async () => {
    const reader = entityCatalogueReader(noHeaders, askCatalogue);
    const [first, second, third] = await Promise.all([
      reader.readProduct("product-18"),
      reader.readProduct("product-03"),
      reader.readProduct("product-05")
    ]);
    assert.equal(first?.name, "Boat Neck");
    assert.equal(second?.name, "Mens Cotton Jacket");
    assert.equal(third?.name, "Dragon Station Chain Bracelet");
    assert.equal(callsToCatalogue.length, 1);
  });

  it("asks once for a product two lines want", async () => {
    const reader = entityCatalogueReader(noHeaders, askCatalogue);
    await Promise.all([reader.readProduct("product-18"), reader.readProduct("product-18")]);
    assert.deepEqual(callsToCatalogue, [[{ __typename: "Product", id: "product-18" }]]);
  });

  it("answers nothing for a product the catalogue does not know", async () => {
    const reader = entityCatalogueReader(noHeaders, askCatalogue);
    assert.equal(await reader.readProduct("product-99"), null);
    assert.deepEqual(await reader.readProducts(["product-99"]), []);
  });

  it("starts a new batch for a new request, because the loader lives one request long", async () => {
    const first = entityCatalogueReader(noHeaders, askCatalogue);
    const second = entityCatalogueReader(noHeaders, askCatalogue);
    await first.readProduct("product-18");
    await second.readProduct("product-18");
    assert.equal(callsToCatalogue.length, 2);
  });
});
