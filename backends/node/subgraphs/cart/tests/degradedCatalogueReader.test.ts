import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { circuitBreaker, money, type CircuitBreaker } from "@zappy/shared";
import {
  degradedCatalogueReader,
  lastKnownProducts,
  type LastKnownProducts
} from "../src/adapters/catalogue/degradedCatalogueReader.js";
import type { CataloguedProduct, CatalogueReader } from "../src/application/ports.js";

const boatNeck: CataloguedProduct = {
  id: "product-18",
  name: "Boat Neck",
  price: money(985),
  stock: 40
};

const cottonJacket: CataloguedProduct = {
  id: "product-03",
  name: "Mens Cotton Jacket",
  price: money(5599),
  stock: 8
};

let catalogueIsDown: boolean;
let attempts: number;
let remembered: LastKnownProducts;
let breaker: CircuitBreaker;
let clock: number;

const liveCatalogue: CatalogueReader = {
  async readProduct(productId: string): Promise<CataloguedProduct | null> {
    attempts = attempts + 1;
    if (catalogueIsDown) {
      throw new Error("connection refused");
    }
    return [boatNeck, cottonJacket].find((product) => product.id === productId) ?? null;
  },
  async readProducts(productIdentifiers: readonly string[]): Promise<readonly CataloguedProduct[]> {
    attempts = attempts + 1;
    if (catalogueIsDown) {
      throw new Error("connection refused");
    }
    return [boatNeck, cottonJacket].filter((product) => productIdentifiers.includes(product.id));
  }
};

beforeEach(() => {
  catalogueIsDown = false;
  attempts = 0;
  clock = 0;
  remembered = lastKnownProducts();
  breaker = circuitBreaker(
    "catalogue",
    { failuresBeforeOpening: 3, openDurationInMilliseconds: 1000, successesBeforeClosing: 1 },
    () => clock
  );
});

describe("the cart when the catalogue is down", () => {
  it("answers live and remembers what it was told", async () => {
    const degraded = degradedCatalogueReader(liveCatalogue, breaker, remembered);
    assert.deepEqual(await degraded.reader.readProducts(["product-18", "product-03"]), [
      boatNeck,
      cottonJacket
    ]);
    assert.deepEqual(degraded.counters(), { answeredLive: 1, answeredFromLastKnown: 0 });
    assert.equal(remembered.size, 2);
  });

  it("keeps the prices it last saw when the catalogue stops answering", async () => {
    const degraded = degradedCatalogueReader(liveCatalogue, breaker, remembered);
    await degraded.reader.readProducts(["product-18", "product-03"]);

    catalogueIsDown = true;
    const stillThere = await degraded.reader.readProducts(["product-18", "product-03"]);

    assert.deepEqual(stillThere, [boatNeck, cottonJacket]);
    assert.deepEqual(degraded.counters(), { answeredLive: 1, answeredFromLastKnown: 1 });
  });

  it("answers nothing for a product it never saw, rather than a wrong price", async () => {
    const degraded = degradedCatalogueReader(liveCatalogue, breaker, remembered);
    catalogueIsDown = true;
    assert.equal(await degraded.reader.readProduct("product-18"), null);
    assert.deepEqual(await degraded.reader.readProducts(["product-18"]), []);
  });

  it("stops calling the catalogue once the circuit is open", async () => {
    const degraded = degradedCatalogueReader(liveCatalogue, breaker, remembered);
    await degraded.reader.readProducts(["product-18"]);
    catalogueIsDown = true;

    await degraded.reader.readProducts(["product-18"]);
    await degraded.reader.readProducts(["product-18"]);
    await degraded.reader.readProducts(["product-18"]);
    assert.equal(breaker.state(), "open");
    const attemptsWhenItOpened = attempts;

    await degraded.reader.readProducts(["product-18"]);
    await degraded.reader.readProducts(["product-18"]);

    assert.equal(attempts, attemptsWhenItOpened);
    assert.deepEqual(await degraded.reader.readProducts(["product-18"]), [boatNeck]);
  });

  it("goes back to the live catalogue once the open period has passed", async () => {
    const degraded = degradedCatalogueReader(liveCatalogue, breaker, remembered);
    catalogueIsDown = true;
    await degraded.reader.readProducts(["product-18"]);
    await degraded.reader.readProducts(["product-18"]);
    await degraded.reader.readProducts(["product-18"]);
    assert.equal(breaker.state(), "open");

    clock = 1000;
    catalogueIsDown = false;
    assert.deepEqual(await degraded.reader.readProducts(["product-18"]), [boatNeck]);
    assert.equal(breaker.state(), "closed");
  });
});
