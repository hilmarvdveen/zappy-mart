import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import { openInMemoryDatabase, systemClock } from "@zappy/shared";
import { createCatalogueTables } from "../src/adapters/persistence/catalogueTables.js";
import { sqlProductRepository } from "../src/adapters/persistence/sqlProductRepository.js";
import { sqlStockReservationStore } from "../src/adapters/persistence/sqlStockReservationStore.js";
import { cachedProductRepository } from "../src/adapters/persistence/cachedProductRepository.js";
import { reserveStock } from "../src/application/reserveStock.js";
import { resetSeed } from "../src/application/resetSeed.js";
import type { ProductChangeListener, ProductRepository } from "../src/application/ports.js";
import type { ProductChanged } from "../src/domain/productChanged.js";
import { wholeCatalogue } from "../src/domain/productChanged.js";

let database: Database;
let storedProducts: ProductRepository;
let heard: ProductChanged[];

const listener: ProductChangeListener = {
  productChanged(event: ProductChanged): void {
    heard.push(event);
  }
};

function cache(): ReturnType<typeof cachedProductRepository> {
  return cachedProductRepository(storedProducts, () => systemClock.now(), [listener]);
}

before(async () => {
  database = openInMemoryDatabase();
  await createCatalogueTables(database);
  storedProducts = sqlProductRepository(database);
  await resetSeed(database, storedProducts).resetOwnData();
});

beforeEach(() => {
  heard = [];
});

after(async () => {
  await database.close();
});

describe("the cached catalogue", () => {
  it("reads the database once and answers every later read from memory", async () => {
    const cached = cache();
    await cached.repository.readAllInCatalogueOrder();
    await cached.repository.readBySlug("mens-cotton-jacket");
    await cached.repository.readManyByIdentifier(["product-01", "product-18"]);
    assert.deepEqual(cached.counters(), { databaseReads: 1, cacheHits: 2, invalidations: 0 });
  });

  it("answers the same products from the cache as the database holds", async () => {
    const cached = cache();
    const fromDatabase = await storedProducts.readAllInCatalogueOrder();
    await cached.repository.readAllInCatalogueOrder();
    assert.deepEqual(await cached.repository.readAllInCatalogueOrder(), fromDatabase);
    assert.deepEqual(await cached.repository.readBySlug("mens-cotton-jacket"), {
      ...(fromDatabase.find((product) => product.slug === "mens-cotton-jacket") ?? null)
    });
  });

  it("drops the cache on a stock write and tells the listeners which product changed", async () => {
    const cached = cache();
    const before = await cached.repository.readBySlug("mens-cotton-jacket");
    assert.equal(before?.stock, 8);

    await cached.repository.writeStock("product-03", 3);

    assert.equal(heard.length, 1);
    assert.equal(heard[0]?.name, "ProductChanged");
    assert.equal(heard[0]?.productId, "product-03");

    const after = await cached.repository.readBySlug("mens-cotton-jacket");
    assert.equal(after?.stock, 3);
    assert.equal(cached.counters().databaseReads, 2);
    assert.equal(cached.counters().invalidations, 1);
    await cached.repository.writeStock("product-03", 8);
  });

  it("drops the whole cache when the catalogue is replaced", async () => {
    const cached = cache();
    await cached.repository.readAllInCatalogueOrder();
    await resetSeed(database, cached.repository).resetOwnData();
    assert.equal(heard.at(-1)?.productId, wholeCatalogue);
    assert.equal(cached.counters().invalidations, 1);
    assert.equal((await cached.repository.readAllInCatalogueOrder()).length, 20);
    assert.equal(cached.counters().databaseReads, 2);
  });

  it("lets a stock reservation reach the cache, so the next read shows the reduced stock", async () => {
    const cached = cache();
    const stock = reserveStock(
      database,
      storedProducts,
      sqlStockReservationStore(database),
      () => systemClock.now(),
      cached.listener
    );

    const before = await cached.repository.readBySlug("mens-cotton-jacket");
    assert.equal(before?.stock, 8);

    const answer = await stock.reserve("checkout-cache-01", [{ productId: "product-03", quantity: 2 }]);
    assert.equal(answer.reserved, true);

    const after = await cached.repository.readBySlug("mens-cotton-jacket");
    assert.equal(after?.stock, 6);
    assert.equal(heard.filter((event) => event.productId === "product-03").length, 1);

    await stock.release("checkout-cache-01");
    assert.equal((await cached.repository.readBySlug("mens-cotton-jacket"))?.stock, 8);
  });
});
