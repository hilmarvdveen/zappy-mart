import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import { openInMemoryDatabase, systemClock } from "@zappy/shared";
import { anonymousContext, buildTestSchema, runOperation } from "@zappy/shared/testing";
import { createCatalogueTables } from "../src/adapters/persistence/catalogueTables.js";
import { sqlCategoryRepository, sqlProductRepository } from "../src/adapters/persistence/sqlProductRepository.js";
import { sqlStockReservationStore } from "../src/adapters/persistence/sqlStockReservationStore.js";
import { readCatalogue } from "../src/application/readCatalogue.js";
import { reserveStock } from "../src/application/reserveStock.js";
import { resetSeed } from "../src/application/resetSeed.js";
import { catalogueResolvers } from "../src/adapters/graphql/resolvers.js";
import { categoryLoader, productLoader } from "../src/adapters/graphql/loaders.js";
import type { CatalogueContext } from "../src/adapters/graphql/context.js";

let database: Database;
let context: CatalogueContext;
const schema = buildTestSchema<CatalogueContext>("catalogue", catalogueResolvers);

before(async () => {
  database = openInMemoryDatabase();
  await createCatalogueTables(database);
  const products = sqlProductRepository(database);
  const categories = sqlCategoryRepository(database);
  const seed = resetSeed(database, products);
  await seed.resetOwnData();
  context = {
    ...anonymousContext(),
    catalogue: readCatalogue(products, categories),
    stock: reserveStock(
      database,
      products,
      sqlStockReservationStore(database),
      () => systemClock.now(),
      { productChanged(): void {} }
    ),
    seed,
    productByIdentifier: productLoader(products),
    categoryBySlug: categoryLoader(categories)
  };
});

after(async () => {
  await database.close();
});

describe("the catalogue subgraph", () => {
  it("pages the catalogue in the seed order", async () => {
    const answer = await runOperation(
      schema,
      "{ products(first: 2) { totalCount pageInfo { hasNextPage endCursor } edges { node { id } } } }",
      {},
      context
    );
    assert.deepEqual(answer.errorMessages, []);
    const products = answer.data?.["products"] as {
      totalCount: number;
      pageInfo: { hasNextPage: boolean };
      edges: readonly { node: { id: string } }[];
    };
    assert.equal(products.totalCount, 20);
    assert.equal(products.pageInfo.hasNextPage, true);
    assert.deepEqual(products.edges.map((edge) => edge.node.id), ["product-01", "product-02"]);
  });

  it("continues after a cursor", async () => {
    const firstPage = await runOperation(
      schema,
      "{ products(first: 1) { pageInfo { endCursor } } }",
      {},
      context
    );
    const endCursor = (firstPage.data?.["products"] as { pageInfo: { endCursor: string } }).pageInfo
      .endCursor;
    const secondPage = await runOperation(
      schema,
      "query Page($after: String) { products(first: 1, after: $after) { edges { node { id } } } }",
      { after: endCursor },
      context
    );
    const edges = (secondPage.data?.["products"] as { edges: readonly { node: { id: string } }[] }).edges;
    assert.deepEqual(edges.map((edge) => edge.node.id), ["product-02"]);
  });

  it("never answers more than one hundred products", async () => {
    const answer = await runOperation(
      schema,
      "{ products(first: 500) { edges { node { id } } totalCount } }",
      {},
      context
    );
    const products = answer.data?.["products"] as { edges: readonly unknown[] };
    assert.equal(products.edges.length, 20);
  });

  it("answers a product with its category and null for an unknown slug", async () => {
    const found = await runOperation(
      schema,
      '{ product(slug: "mens-cotton-jacket") { id name price { amount currency } category { slug } } }',
      {},
      context
    );
    assert.deepEqual(found.data?.["product"], {
      id: "product-03",
      name: "Mens Cotton Jacket",
      price: { amount: 5599, currency: "EUR" },
      category: { slug: "mens-clothing" }
    });

    const missing = await runOperation(schema, '{ product(slug: "nothing") { id } }', {}, context);
    assert.equal(missing.data?.["product"], null);
  });

  it("answers the four categories in the seed order", async () => {
    const answer = await runOperation(schema, "{ categories { slug } }", {}, context);
    assert.deepEqual(answer.data?.["categories"], [
      { slug: "mens-clothing" },
      { slug: "jewellery" },
      { slug: "electronics" },
      { slug: "womens-clothing" }
    ]);
  });

  it("resolves a product reference the way the router asks for it", async () => {
    const answer = await runOperation(
      schema,
      `query Reference($representations: [_Any!]!) {
        _entities(representations: $representations) { ... on Product { id name stock } }
      }`,
      { representations: [{ __typename: "Product", id: "product-12" }] },
      context
    );
    assert.deepEqual(answer.data?.["_entities"], [
      { id: "product-12", name: "WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive", stock: 1 }
    ]);
  });

  it("reserves stock once for one idempotency key and replays the answer", async () => {
    const document = `mutation Reserve($idempotencyKey: String!, $lines: [StockLine!]!) {
      reserveStock(idempotencyKey: $idempotencyKey, lines: $lines) {
        reserved
        unavailableProductId
        availableStock
      }
    }`;
    const variables = { idempotencyKey: "key-one", lines: [{ productId: "product-01", quantity: 2 }] };
    const first = await runOperation(schema, document, variables, context);
    assert.deepEqual(first.data?.["reserveStock"], {
      reserved: true,
      unavailableProductId: null,
      availableStock: null
    });

    const afterFirst = await runOperation(
      schema,
      '{ product(slug: "fjallraven-foldsack-no-1-backpack") { stock } }',
      {},
      context
    );
    assert.equal((afterFirst.data?.["product"] as { stock: number }).stock, 10);

    const replay = await runOperation(schema, document, variables, context);
    assert.deepEqual(replay.data?.["reserveStock"], {
      reserved: true,
      unavailableProductId: null,
      availableStock: null
    });

    const afterReplay = await runOperation(
      schema,
      '{ product(slug: "fjallraven-foldsack-no-1-backpack") { stock } }',
      {},
      context
    );
    assert.equal((afterReplay.data?.["product"] as { stock: number }).stock, 10);
  });

  it("refuses a reservation it cannot fill and moves no stock at all", async () => {
    const answer = await runOperation(
      schema,
      `mutation Reserve($idempotencyKey: String!, $lines: [StockLine!]!) {
        reserveStock(idempotencyKey: $idempotencyKey, lines: $lines) {
          reserved unavailableProductId availableStock
        }
      }`,
      {
        idempotencyKey: "key-two",
        lines: [
          { productId: "product-02", quantity: 1 },
          { productId: "product-12", quantity: 5 }
        ]
      },
      context
    );
    assert.deepEqual(answer.data?.["reserveStock"], {
      reserved: false,
      unavailableProductId: "product-12",
      availableStock: 1
    });

    const untouched = await runOperation(
      schema,
      '{ product(slug: "mens-casual-premium-slim-fit-t-shirts") { stock } }',
      {},
      context
    );
    assert.equal((untouched.data?.["product"] as { stock: number }).stock, 25);
  });

  it("gives the stock back when a reservation is released", async () => {
    await runOperation(
      schema,
      `mutation Reserve($idempotencyKey: String!, $lines: [StockLine!]!) {
        reserveStock(idempotencyKey: $idempotencyKey, lines: $lines) { reserved }
      }`,
      { idempotencyKey: "key-three", lines: [{ productId: "product-04", quantity: 3 }] },
      context
    );
    const released = await runOperation(
      schema,
      'mutation { releaseStock(idempotencyKey: "key-three") }',
      {},
      context
    );
    assert.equal(released.data?.["releaseStock"], true);

    const restored = await runOperation(
      schema,
      '{ product(slug: "mens-casual-slim-fit") { stock } }',
      {},
      context
    );
    assert.equal((restored.data?.["product"] as { stock: number }).stock, 18);

    const releasedTwice = await runOperation(
      schema,
      'mutation { releaseStock(idempotencyKey: "key-three") }',
      {},
      context
    );
    assert.equal(releasedTwice.data?.["releaseStock"], false);
  });
});
