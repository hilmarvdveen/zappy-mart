import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database } from "@zappy/shared";
import { money, openInMemoryDatabase, systemClock } from "@zappy/shared";
import { anonymousContext, buildTestSchema, runOperation } from "@zappy/shared/testing";
import { createCartTables } from "../src/adapters/persistence/cartTables.js";
import { sqlCartRepository } from "../src/adapters/persistence/sqlCartRepository.js";
import { changeCart } from "../src/application/changeCart.js";
import type { CataloguedProduct, CatalogueReader } from "../src/application/ports.js";
import { cartResolvers } from "../src/adapters/graphql/resolvers.js";
import type { CartContext } from "../src/adapters/graphql/context.js";

const catalogue: readonly CataloguedProduct[] = [
  { id: "product-18", name: "Boat Neck", price: money(985), stock: 25 },
  { id: "product-12", name: "Gaming Drive", price: money(11400), stock: 1 },
  { id: "product-07", name: "Princess Ring", price: money(999), stock: 0 }
];

const fixedCatalogueReader: CatalogueReader = {
  async readProduct(productId: string): Promise<CataloguedProduct | null> {
    return catalogue.find((product) => product.id === productId) ?? null;
  },
  async readProducts(productIdentifiers: readonly string[]): Promise<readonly CataloguedProduct[]> {
    return catalogue.filter((product) => productIdentifiers.includes(product.id));
  }
};

let database: Database;
let context: CartContext;
const schema = buildTestSchema<CartContext>("cart", cartResolvers);

const cartFields = `
  cart { id lines { id quantity product { id } lineTotal { amount } } subtotal { amount } }
  availableStock
  errors { code message field }
`;

before(async () => {
  database = openInMemoryDatabase();
  await createCartTables(database);
});

beforeEach(async () => {
  const carts = sqlCartRepository(database);
  await carts.removeEverything();
  let visitorKey: string | null = null;
  context = {
    ...anonymousContext(),
    carts,
    catalogue: fixedCatalogueReader,
    cart: changeCart(carts, fixedCatalogueReader, () => systemClock.now()),
    visitorIdentity() {
      return { customerId: null, visitorKey };
    },
    rememberVisitor(): string {
      visitorKey = visitorKey ?? "visitor-one";
      return visitorKey;
    },
    async resetOwnData(): Promise<void> {
      await carts.removeEverything();
    }
  };
});

after(async () => {
  await database.close();
});

describe("the cart subgraph", () => {
  it("answers an empty cart with a subtotal of nothing", async () => {
    const answer = await runOperation(schema, "{ cart { lines { id } subtotal { amount } } }", {}, context);
    assert.deepEqual(answer.data?.["cart"], { lines: [], subtotal: { amount: 0 } });
  });

  it("adds a product and prices the line from the catalogue", async () => {
    const answer = await runOperation(
      schema,
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-18", quantity: 2 },
      context
    );
    const payload = answer.data?.["addToCart"] as {
      cart: { lines: readonly { quantity: number; lineTotal: { amount: number } }[]; subtotal: { amount: number } };
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.cart.lines[0]?.quantity, 2);
    assert.equal(payload.cart.lines[0]?.lineTotal.amount, 1970);
    assert.equal(payload.cart.subtotal.amount, 1970);
  });

  it("refuses a product the catalogue does not have", async () => {
    const answer = await runOperation(
      schema,
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-99" },
      context
    );
    const payload = answer.data?.["addToCart"] as { errors: readonly { code: string; field: string }[] };
    assert.equal(payload.errors[0]?.code, "PRODUCT_NOT_FOUND");
    assert.equal(payload.errors[0]?.field, "productId");
  });

  it("refuses a quantity of zero and keeps the cart as it was", async () => {
    const answer = await runOperation(
      schema,
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-18", quantity: 0 },
      context
    );
    const payload = answer.data?.["addToCart"] as {
      cart: { lines: readonly unknown[] };
      errors: readonly { code: string }[];
    };
    assert.equal(payload.errors[0]?.code, "QUANTITY_INVALID");
    assert.deepEqual(payload.cart.lines, []);
  });

  it("refuses more than the stock and says how many are left", async () => {
    const answer = await runOperation(
      schema,
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-12", quantity: 2 },
      context
    );
    const payload = answer.data?.["addToCart"] as {
      availableStock: number;
      errors: readonly { code: string }[];
    };
    assert.equal(payload.errors[0]?.code, "OUT_OF_STOCK");
    assert.equal(payload.availableStock, 1);
  });

  it("refuses the product with no stock at all", async () => {
    const answer = await runOperation(
      schema,
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-07" },
      context
    );
    const payload = answer.data?.["addToCart"] as {
      availableStock: number;
      errors: readonly { code: string }[];
    };
    assert.equal(payload.errors[0]?.code, "OUT_OF_STOCK");
    assert.equal(payload.availableStock, 0);
  });

  it("changes a line to an exact quantity and refuses one that is not there", async () => {
    const added = await runOperation(
      schema,
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-18" },
      context
    );
    const lineId = (
      added.data?.["addToCart"] as { cart: { lines: readonly { id: string }[] } }
    ).cart.lines[0]?.id;

    const changed = await runOperation(
      schema,
      `mutation Change($lineId: ID!, $quantity: Int!) { changeCartLineQuantity(lineId: $lineId, quantity: $quantity) { ${cartFields} } }`,
      { lineId, quantity: 4 },
      context
    );
    const payload = changed.data?.["changeCartLineQuantity"] as {
      cart: { lines: readonly { quantity: number }[] };
    };
    assert.equal(payload.cart.lines[0]?.quantity, 4);

    const unknown = await runOperation(
      schema,
      `mutation Change($lineId: ID!, $quantity: Int!) { changeCartLineQuantity(lineId: $lineId, quantity: $quantity) { ${cartFields} } }`,
      { lineId: "line-nothing", quantity: 1 },
      context
    );
    assert.equal(
      (unknown.data?.["changeCartLineQuantity"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "CART_LINE_NOT_FOUND"
    );
  });

  it("removes a line and answers CART_LINE_NOT_FOUND when it is removed twice", async () => {
    const added = await runOperation(
      schema,
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-18" },
      context
    );
    const lineId = (
      added.data?.["addToCart"] as { cart: { lines: readonly { id: string }[] } }
    ).cart.lines[0]?.id;

    const removed = await runOperation(
      schema,
      `mutation Remove($lineId: ID!) { removeCartLine(lineId: $lineId) { ${cartFields} } }`,
      { lineId },
      context
    );
    assert.deepEqual((removed.data?.["removeCartLine"] as { cart: { lines: readonly unknown[] } }).cart.lines, []);

    const again = await runOperation(
      schema,
      `mutation Remove($lineId: ID!) { removeCartLine(lineId: $lineId) { ${cartFields} } }`,
      { lineId },
      context
    );
    assert.equal(
      (again.data?.["removeCartLine"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "CART_LINE_NOT_FOUND"
    );
  });

  it("resolves a cart reference the way the router asks for it", async () => {
    const added = await runOperation(
      schema,
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-18" },
      context
    );
    const cartId = (added.data?.["addToCart"] as { cart: { id: string } }).cart.id;

    const answer = await runOperation(
      schema,
      `query Reference($representations: [_Any!]!) {
        _entities(representations: $representations) { ... on Cart { id subtotal { amount } lines { quantity } } }
      }`,
      { representations: [{ __typename: "Cart", id: cartId }] },
      context
    );
    assert.deepEqual(answer.data?.["_entities"], [
      { id: cartId, subtotal: { amount: 985 }, lines: [{ quantity: 1 }] }
    ]);
  });

  it("empties a cart by its id for the ordering subgraph", async () => {
    const added = await runOperation(
      schema,
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-18" },
      context
    );
    const cartId = (added.data?.["addToCart"] as { cart: { id: string } }).cart.id;

    const emptied = await runOperation(
      schema,
      "mutation Empty($cartId: ID!) { emptyCart(cartId: $cartId) }",
      { cartId },
      context
    );
    assert.equal(emptied.data?.["emptyCart"], true);

    const read = await runOperation(schema, "{ cart { lines { id } } }", {}, context);
    assert.deepEqual((read.data?.["cart"] as { lines: readonly unknown[] }).lines, []);
  });

  it("moves the anonymous cart onto the customer and adds up the quantities", async () => {
    const carts = sqlCartRepository(database);
    await runOperation(
      schema,
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-18", quantity: 2 },
      context
    );
    const merged = await runOperation(
      schema,
      "mutation Merge($visitorKey: String!, $customerId: ID!) { mergeAnonymousCart(visitorKey: $visitorKey, customerId: $customerId) }",
      { visitorKey: "visitor-one", customerId: "customer-01" },
      context
    );
    assert.equal(merged.data?.["mergeAnonymousCart"], true);

    const moved = await carts.readByOwnerKey("customer:customer-01");
    assert.equal(moved?.lines[0]?.quantity, 2);
    assert.equal(await carts.readByOwnerKey("visitor:visitor-one"), null);
  });
});
