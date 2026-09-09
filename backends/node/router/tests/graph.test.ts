import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const databaseFolder = mkdtempSync(join(tmpdir(), "zappy-graph-"));
for (const name of ["CATALOGUE", "CART", "PROMOTIONS", "ORDERING", "ACCOUNTS"]) {
  process.env[`ZAPPY_${name}_SQLITE_FILE`] = join(databaseFolder, `${name.toLowerCase()}.sqlite`);
}
process.env["ZAPPY_PROFILE"] = "development";

const { startCatalogue } = await import("@zappy/catalogue");
const { startCart } = await import("@zappy/cart");
const { startPromotions } = await import("@zappy/promotions");
const { startOrdering } = await import("@zappy/ordering");
const { startAccounts } = await import("@zappy/accounts");
const { startGateway } = await import("../src/host/main.js");
const { graphClient } = await import("./graphClient.js");

type RunningPart = { stop(): Promise<void> };

const running: RunningPart[] = [];
const client = graphClient("http://localhost:4100/graphql");

const cartFields = `
  cart {
    id
    lines { id quantity product { id name } lineTotal { amount currency } }
    promotion { code kind discount { amount } }
    subtotal { amount }
    shipping { amount }
    total { amount }
  }
  availableStock
  errors { code message field }
`;

async function resetSeed(): Promise<void> {
  const answer = await client.ask("mutation { resetSeed { success loadedProducts errors { code } } }");
  assert.deepEqual(answer.errors, []);
  assert.equal((answer.data?.["resetSeed"] as { loadedProducts: number }).loadedProducts, 20);
}

before(async () => {
  running.push(await startAccounts());
  running.push(await startCatalogue());
  running.push(await startCart());
  running.push(await startPromotions());
  running.push(await startOrdering());
  running.push(await startGateway());
});

after(async () => {
  for (const part of running.reverse()) {
    await part.stop();
  }
  rmSync(databaseFolder, { recursive: true, force: true });
});

describe("the federated graph", () => {
  it("answers the catalogue in the seed order with its categories", async () => {
    await resetSeed();
    client.forgetCookies();
    const answer = await client.ask(`
      {
        categories { id name slug }
        products(first: 3) {
          totalCount
          pageInfo { hasNextPage endCursor }
          edges { cursor node { id name slug price { amount currency } stock category { slug } } }
        }
      }
    `);
    assert.deepEqual(answer.errors, []);
    const categories = answer.data?.["categories"] as readonly { slug: string }[];
    assert.deepEqual(
      categories.map((category) => category.slug),
      ["mens-clothing", "jewellery", "electronics", "womens-clothing"]
    );
    const products = answer.data?.["products"] as {
      totalCount: number;
      edges: readonly { node: { id: string; category: { slug: string } } }[];
    };
    assert.equal(products.totalCount, 20);
    assert.deepEqual(
      products.edges.map((edge) => edge.node.id),
      ["product-01", "product-02", "product-03"]
    );
    assert.equal(products.edges[0]?.node.category.slug, "mens-clothing");
  });

  it("leaves the product without stock out when the filter asks for stock only", async () => {
    const everything = await client.ask("{ products(first: 100) { totalCount } }");
    const inStock = await client.ask(
      "{ products(first: 100, filter: { inStockOnly: true }) { totalCount } }"
    );
    assert.equal((everything.data?.["products"] as { totalCount: number }).totalCount, 20);
    assert.equal((inStock.data?.["products"] as { totalCount: number }).totalCount, 19);
  });

  it("answers one product by slug and null for a slug nobody has", async () => {
    const found = await client.ask('{ product(slug: "mens-cotton-jacket") { id name price { amount } } }');
    assert.equal((found.data?.["product"] as { id: string }).id, "product-03");
    const missing = await client.ask('{ product(slug: "no-such-product") { id } }');
    assert.equal(missing.data?.["product"], null);
  });

  it("charges nothing for an empty cart", async () => {
    await resetSeed();
    client.forgetCookies();
    const answer = await client.ask(
      "{ cart { lines { id } subtotal { amount } shipping { amount } total { amount } } }"
    );
    assert.deepEqual(answer.data?.["cart"], {
      lines: [],
      subtotal: { amount: 0 },
      shipping: { amount: 0 },
      total: { amount: 0 }
    });
  });

  it("adds a product, raises the quantity on a second add and works out the totals", async () => {
    await resetSeed();
    client.forgetCookies();
    const first = await client.ask(
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-18", quantity: 1 }
    );
    assert.deepEqual(first.errors, []);
    const afterFirst = first.data?.["addToCart"] as { cart: { subtotal: { amount: number } } };
    assert.equal(afterFirst.cart.subtotal.amount, 985);

    const second = await client.ask(
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-18", quantity: 1 }
    );
    const afterSecond = second.data?.["addToCart"] as {
      cart: {
        lines: readonly { quantity: number }[];
        subtotal: { amount: number };
        shipping: { amount: number };
        total: { amount: number };
      };
    };
    assert.equal(afterSecond.cart.lines.length, 1);
    assert.equal(afterSecond.cart.lines[0]?.quantity, 2);
    assert.equal(afterSecond.cart.subtotal.amount, 1970);
    assert.equal(afterSecond.cart.shipping.amount, 495);
    assert.equal(afterSecond.cart.total.amount, 2465);
  });

  it("refuses a quantity above the stock and names how many are left", async () => {
    await resetSeed();
    client.forgetCookies();
    const first = await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-12" }
    );
    assert.deepEqual((first.data?.["addToCart"] as { errors: readonly unknown[] }).errors, []);

    const second = await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-12" }
    );
    const refused = second.data?.["addToCart"] as {
      availableStock: number;
      errors: readonly { code: string }[];
    };
    assert.equal(refused.errors[0]?.code, "OUT_OF_STOCK");
    assert.equal(refused.availableStock, 1);
  });

  it("refuses the product without stock", async () => {
    await resetSeed();
    client.forgetCookies();
    const answer = await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-07" }
    );
    const refused = answer.data?.["addToCart"] as {
      availableStock: number;
      errors: readonly { code: string }[];
    };
    assert.equal(refused.errors[0]?.code, "OUT_OF_STOCK");
    assert.equal(refused.availableStock, 0);
  });

  it("applies a percentage code, rounds half up and drops the shipping above five thousand", async () => {
    await resetSeed();
    client.forgetCookies();
    await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-03" }
    );
    const answer = await client.ask(
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartFields} } }`,
      { code: "welcome10" }
    );
    assert.deepEqual(answer.errors, []);
    const payload = answer.data?.["applyPromotionCode"] as {
      cart: {
        promotion: { code: string; kind: string; discount: { amount: number } };
        subtotal: { amount: number };
        shipping: { amount: number };
        total: { amount: number };
      };
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.cart.promotion.code, "WELCOME10");
    assert.equal(payload.cart.promotion.kind, "PERCENTAGE");
    assert.equal(payload.cart.subtotal.amount, 5599);
    assert.equal(payload.cart.promotion.discount.amount, 560);
    assert.equal(payload.cart.shipping.amount, 0);
    assert.equal(payload.cart.total.amount, 5039);
  });

  it("makes the shipping zero with a free shipping code and keeps the discount at zero", async () => {
    await resetSeed();
    client.forgetCookies();
    await client.ask(
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-18", quantity: 2 }
    );
    const answer = await client.ask(
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartFields} } }`,
      { code: "FREESHIP" }
    );
    const payload = answer.data?.["applyPromotionCode"] as {
      cart: {
        promotion: { kind: string; discount: { amount: number } };
        subtotal: { amount: number };
        shipping: { amount: number };
        total: { amount: number };
      };
    };
    assert.equal(payload.cart.promotion.kind, "FREE_SHIPPING");
    assert.equal(payload.cart.promotion.discount.amount, 0);
    assert.equal(payload.cart.subtotal.amount, 1970);
    assert.equal(payload.cart.shipping.amount, 0);
    assert.equal(payload.cart.total.amount, 1970);
  });

  it("refuses an expired code, an exhausted code and an unknown code", async () => {
    await resetSeed();
    client.forgetCookies();
    await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-03" }
    );
    for (const [code, expected] of [
      ["SUMMER2025", "CODE_EXPIRED"],
      ["ONCE", "CODE_EXHAUSTED"],
      ["NOSUCHCODE", "CODE_UNKNOWN"]
    ] as const) {
      const answer = await client.ask(
        `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartFields} } }`,
        { code }
      );
      const payload = answer.data?.["applyPromotionCode"] as { errors: readonly { code: string }[] };
      assert.equal(payload.errors[0]?.code, expected, `${code} should answer ${expected}`);
    }
  });

  it("refuses a fixed amount code below its minimum subtotal", async () => {
    await resetSeed();
    client.forgetCookies();
    await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-19" }
    );
    const answer = await client.ask(
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartFields} } }`,
      { code: "FIVEOFF" }
    );
    const payload = answer.data?.["applyPromotionCode"] as { errors: readonly { code: string }[] };
    assert.equal(payload.errors[0]?.code, "CODE_MINIMUM_NOT_MET");
  });

  it("replaces the code when a second one is applied", async () => {
    await resetSeed();
    client.forgetCookies();
    await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-03" }
    );
    await client.ask(`mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartFields} } }`, {
      code: "WELCOME10"
    });
    const answer = await client.ask(
      `mutation Apply($code: String!) { applyPromotionCode(code: $code) { ${cartFields} } }`,
      { code: "FREESHIP" }
    );
    const payload = answer.data?.["applyPromotionCode"] as {
      cart: { promotion: { code: string } };
    };
    assert.equal(payload.cart.promotion.code, "FREESHIP");

    const removed = await client.ask(`mutation { removePromotionCode { ${cartFields} } }`);
    const withoutCode = removed.data?.["removePromotionCode"] as { cart: { promotion: unknown } };
    assert.equal(withoutCode.cart.promotion, null);
  });

  it("refuses every mutation that arrives without an Origin header", async () => {
    const answer = await client.askWithoutOrigin(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-01" }
    );
    assert.equal(answer.data, null);
    assert.equal(answer.errors.length, 1);
    assert.match(answer.errors[0]?.message ?? "", /Origin/);
  });

  it("registers a customer, signs them in and answers me", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    const answer = await client.ask(
      `mutation Register($input: RegisterInput!) {
        register(input: $input) {
          customer { id email name }
          accessToken
          accessTokenExpiresAt
          errors { code field }
        }
      }`,
      { input: { email: "New.Person@example.com", name: "New Person", password: "correct horse battery" } }
    );
    const payload = answer.data?.["register"] as {
      customer: { email: string; name: string };
      accessToken: string;
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.customer.email, "new.person@example.com");
    client.useAccessToken(payload.accessToken);

    const me = await client.ask("{ me { email name } }");
    assert.deepEqual(me.data?.["me"], { email: "new.person@example.com", name: "New Person" });
    client.useAccessToken(null);
  });

  it("refuses a second registration of the same address and a password that is too short", async () => {
    await resetSeed();
    client.forgetCookies();
    const taken = await client.ask(
      "mutation Register($input: RegisterInput!) { register(input: $input) { errors { code field } } }",
      { input: { email: "jane@example.com", name: "Jane Twice", password: "correct horse battery" } }
    );
    assert.equal(
      (taken.data?.["register"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "EMAIL_TAKEN"
    );

    const short = await client.ask(
      "mutation Register($input: RegisterInput!) { register(input: $input) { errors { code field } } }",
      { input: { email: "short@example.com", name: "Short", password: "too short" } }
    );
    assert.equal(
      (short.data?.["register"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "PASSWORD_TOO_SHORT"
    );
  });

  it("logs the seeded customer in and refuses a wrong password with one code", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    const wrong = await client.ask(
      "mutation Login($input: LoginInput!) { login(input: $input) { errors { code } } }",
      { input: { email: "jane@example.com", password: "not the password" } }
    );
    assert.equal(
      (wrong.data?.["login"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "CREDENTIALS_INVALID"
    );

    const right = await client.ask(
      `mutation Login($input: LoginInput!) {
        login(input: $input) {
          customer { id email sessions { id device current } }
          accessToken
          errors { code }
        }
      }`,
      {
        input: {
          email: "jane@example.com",
          password: "correct horse battery staple",
          device: "Chrome on Windows"
        }
      }
    );
    const payload = right.data?.["login"] as {
      customer: { id: string; sessions: readonly { device: string; current: boolean }[] };
      accessToken: string;
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.customer.id, "customer-01");
    assert.match(client.cookieHeader(), /zappy_refresh=/);
    client.useAccessToken(payload.accessToken);

    const sessions = await client.ask("{ me { sessions { id device current } } }");
    const listed = (sessions.data?.["me"] as { sessions: readonly { device: string; current: boolean }[] })
      .sessions;
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.device, "Chrome on Windows");
    assert.equal(listed[0]?.current, true);
    client.useAccessToken(null);
  });

  it("rotates the refresh token and revokes the family when a rotated token comes back", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    await client.ask(
      "mutation Login($input: LoginInput!) { login(input: $input) { accessToken errors { code } } }",
      { input: { email: "jane@example.com", password: "correct horse battery staple" } }
    );
    const firstCookie = client.cookieHeader();

    const refreshed = await client.ask(
      "mutation { refreshSession { accessToken accessTokenExpiresAt errors { code } } }"
    );
    const rotated = refreshed.data?.["refreshSession"] as {
      accessToken: string | null;
      errors: readonly unknown[];
    };
    assert.deepEqual(rotated.errors, []);
    assert.notEqual(client.cookieHeader(), firstCookie);

    const replay = await refreshWithCookie(firstCookie);
    assert.equal(
      (replay.data?.["refreshSession"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "SESSION_INVALID"
    );
  });

  it("keeps an anonymous wishlist and merges it into the customer's on login", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    const anonymous = await client.ask(
      "mutation Save($productId: ID!) { addToWishlist(productId: $productId) { products { id } errors { code } } }",
      { productId: "product-05" }
    );
    const saved = anonymous.data?.["addToWishlist"] as {
      products: readonly { id: string }[];
      errors: readonly unknown[];
    };
    assert.deepEqual(saved.errors, []);
    assert.deepEqual(
      saved.products.map((product) => product.id),
      ["product-05"]
    );

    const listed = await client.ask("{ wishlist { id name } }");
    assert.deepEqual(
      (listed.data?.["wishlist"] as readonly { id: string }[]).map((product) => product.id),
      ["product-05"]
    );

    const login = await client.ask(
      "mutation Login($input: LoginInput!) { login(input: $input) { accessToken errors { code } } }",
      { input: { email: "jane@example.com", password: "correct horse battery staple" } }
    );
    client.useAccessToken((login.data?.["login"] as { accessToken: string }).accessToken);

    const merged = await client.ask("{ wishlist { id } me { wishlist { id } } }");
    assert.deepEqual(
      (merged.data?.["wishlist"] as readonly { id: string }[]).map((product) => product.id),
      ["product-05"]
    );

    const removed = await client.ask(
      "mutation Forget($productId: ID!) { removeFromWishlist(productId: $productId) { products { id } errors { code } } }",
      { productId: "product-05" }
    );
    assert.deepEqual((removed.data?.["removeFromWishlist"] as { products: readonly unknown[] }).products, []);
    client.useAccessToken(null);
  });

  it("places an order from the cart, empties it and keeps the amounts of the moment", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    await client.ask(
      `mutation Add($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
      { productId: "product-18", quantity: 2 }
    );
    const login = await client.ask(
      "mutation Login($input: LoginInput!) { login(input: $input) { accessToken errors { code } } }",
      { input: { email: "jane@example.com", password: "correct horse battery staple" } }
    );
    client.useAccessToken((login.data?.["login"] as { accessToken: string }).accessToken);

    const placed = await client.ask(
      `mutation Place($idempotencyKey: String) {
        placeOrder(idempotencyKey: $idempotencyKey) {
          order {
            id number status placedAt promotionCode
            lines { productName unitPrice { amount } quantity lineTotal { amount } }
            subtotal { amount } discount { amount } shipping { amount } total { amount }
          }
          errors { code message }
        }
      }`,
      { idempotencyKey: "checkout-one" }
    );
    const payload = placed.data?.["placeOrder"] as {
      order: {
        id: string;
        number: string;
        status: string;
        lines: readonly { productName: string; quantity: number; lineTotal: { amount: number } }[];
        subtotal: { amount: number };
        discount: { amount: number };
        shipping: { amount: number };
        total: { amount: number };
      };
      errors: readonly unknown[];
    };
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.order.status, "PAID");
    assert.equal(payload.order.lines.length, 1);
    assert.equal(payload.order.lines[0]?.quantity, 2);
    assert.equal(payload.order.subtotal.amount, 1970);
    assert.equal(payload.order.discount.amount, 0);
    assert.equal(payload.order.shipping.amount, 495);
    assert.equal(payload.order.total.amount, 2465);

    const emptied = await client.ask("{ cart { lines { id } total { amount } } }");
    assert.deepEqual((emptied.data?.["cart"] as { lines: readonly unknown[] }).lines, []);

    const stock = await client.ask('{ product(slug: "mbj-womens-solid-short-sleeve-boat-neck-v") { stock } }');
    assert.equal((stock.data?.["product"] as { stock: number }).stock, 23);

    const listedOrders = await client.ask(
      "{ orders(first: 5) { totalCount edges { node { id number total { amount } } } } }"
    );
    const orders = listedOrders.data?.["orders"] as {
      totalCount: number;
      edges: readonly { node: { id: string } }[];
    };
    assert.equal(orders.totalCount, 1);
    assert.equal(orders.edges[0]?.node.id, payload.order.id);

    const single = await client.ask("query One($id: ID!) { order(id: $id) { number } }", {
      id: payload.order.id
    });
    assert.equal((single.data?.["order"] as { number: string }).number, payload.order.number);
    client.useAccessToken(null);
  });

  it("answers the same order when the same idempotency key comes back", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    await client.ask(
      `mutation Add($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
      { productId: "product-18" }
    );
    const login = await client.ask(
      "mutation Login($input: LoginInput!) { login(input: $input) { accessToken errors { code } } }",
      { input: { email: "jane@example.com", password: "correct horse battery staple" } }
    );
    client.useAccessToken((login.data?.["login"] as { accessToken: string }).accessToken);

    const document = `mutation Place($idempotencyKey: String) {
      placeOrder(idempotencyKey: $idempotencyKey) { order { id number } errors { code } }
    }`;
    const first = await client.ask(document, { idempotencyKey: "checkout-repeat" });
    const second = await client.ask(document, { idempotencyKey: "checkout-repeat" });
    const firstOrder = (first.data?.["placeOrder"] as { order: { id: string } }).order;
    const secondOrder = (second.data?.["placeOrder"] as { order: { id: string } }).order;
    assert.equal(secondOrder.id, firstOrder.id);
    client.useAccessToken(null);
  });

  it("refuses an order from an empty cart and one without a signed in customer", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    const anonymous = await client.ask(
      "mutation { placeOrder(idempotencyKey: \"anonymous\") { order { id } errors { code } } }"
    );
    assert.equal(
      (anonymous.data?.["placeOrder"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "NOT_AUTHENTICATED"
    );

    const login = await client.ask(
      "mutation Login($input: LoginInput!) { login(input: $input) { accessToken errors { code } } }",
      { input: { email: "jane@example.com", password: "correct horse battery staple" } }
    );
    client.useAccessToken((login.data?.["login"] as { accessToken: string }).accessToken);
    const empty = await client.ask(
      "mutation { placeOrder(idempotencyKey: \"empty-cart\") { order { id } errors { code } } }"
    );
    assert.equal(
      (empty.data?.["placeOrder"] as { errors: readonly { code: string }[] }).errors[0]?.code,
      "CART_EMPTY"
    );
    client.useAccessToken(null);
  });

  it("stops accepting an access token the moment its session is revoked", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    const login = await client.ask(
      `mutation Login($input: LoginInput!) {
        login(input: $input) { accessToken customer { sessions { id } } errors { code } }
      }`,
      { input: { email: "jane@example.com", password: "correct horse battery staple" } }
    );
    const payload = login.data?.["login"] as {
      accessToken: string;
      customer: { sessions: readonly { id: string }[] };
    };
    client.useAccessToken(payload.accessToken);
    const sessionId = payload.customer.sessions[0]?.id ?? "";

    const stillSignedIn = await client.ask("{ me { email } }");
    assert.notEqual(stillSignedIn.data?.["me"], null);

    const revoked = await client.ask(
      "mutation Revoke($sessionId: ID!) { revokeSession(sessionId: $sessionId) { sessions { id } errors { code } } }",
      { sessionId }
    );
    assert.deepEqual((revoked.data?.["revokeSession"] as { errors: readonly unknown[] }).errors, []);
    assert.deepEqual((revoked.data?.["revokeSession"] as { sessions: readonly unknown[] }).sessions, []);

    const afterRevocation = await client.ask("{ me { email } }");
    assert.equal(afterRevocation.data?.["me"], null);
    client.useAccessToken(null);
  });

  it("stops accepting an access token the moment the customer logs out", async () => {
    await resetSeed();
    client.forgetCookies();
    client.useAccessToken(null);
    const login = await client.ask(
      "mutation Login($input: LoginInput!) { login(input: $input) { accessToken errors { code } } }",
      { input: { email: "jane@example.com", password: "correct horse battery staple" } }
    );
    client.useAccessToken((login.data?.["login"] as { accessToken: string }).accessToken);

    const loggedOut = await client.ask("mutation { logout { success errors { code } } }");
    assert.equal((loggedOut.data?.["logout"] as { success: boolean }).success, true);

    const afterLogout = await client.ask("{ me { email } }");
    assert.equal(afterLogout.data?.["me"], null);
    client.useAccessToken(null);
  });
});

async function refreshWithCookie(cookieHeader: string): Promise<{ data: Record<string, unknown> | null }> {
  const response = await fetch("http://localhost:4100/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:5173",
      cookie: cookieHeader
    },
    body: JSON.stringify({ query: "mutation { refreshSession { accessToken errors { code } } }" })
  });
  return (await response.json()) as { data: Record<string, unknown> | null };
}
