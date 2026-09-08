import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createClient, signInSeedCustomer, startTestServer, testOrigin } from "./graphqlClient.mjs";
import { readCookies, serialiseCookie } from "../server.mjs";

async function refreshWithCookie(url, refreshToken) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: testOrigin,
      cookie: `zappy_refresh=${refreshToken}`
    },
    body: JSON.stringify({ query: "mutation { refreshSession { errors { code } } }" })
  });
  return response.json();
}

describe("the mock server over http", () => {
  let server = null;

  before(async () => {
    server = await startTestServer();
  });

  after(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    const client = createClient(server.url);
    const answer = await client.run("mutation { resetSeed { success loadedProducts errors { code } } }");
    assert.deepEqual(answer.data.resetSeed, { success: true, loadedProducts: 20, errors: [] });
  });

  test("reads cookies from a header and writes them with their attributes", () => {
    assert.deepEqual(readCookies("zappy_cart=cart-1; zappy_refresh=abc"), {
      zappy_cart: "cart-1",
      zappy_refresh: "abc"
    });
    assert.deepEqual(readCookies(undefined), {});
    assert.equal(
      serialiseCookie("zappy_refresh", "token", { path: "/graphql", lifetimeInSeconds: 60 }),
      "zappy_refresh=token; Path=/graphql; Max-Age=60; HttpOnly; Secure; SameSite=Lax"
    );
  });

  test("serves the catalogue in the seed order with a page cap of one hundred", async () => {
    const client = createClient(server.url);
    const answer = await client.run(`{
      products(first: 500) { totalCount edges { node { id slug stock } } pageInfo { hasNextPage } }
      categories { slug }
    }`);

    assert.equal(answer.data.products.totalCount, 20);
    assert.equal(answer.data.products.edges.length, 20);
    assert.equal(answer.data.products.edges[0].node.id, "product-01");
    assert.equal(answer.data.products.pageInfo.hasNextPage, false);
    assert.deepEqual(
      answer.data.categories.map((category) => category.slug),
      ["mens-clothing", "jewellery", "electronics", "womens-clothing"]
    );
  });

  test("answers one product by its slug and null for an unknown slug", async () => {
    const client = createClient(server.url);
    const answer = await client.run(`{
      known: product(slug: "mens-cotton-jacket") { id name price { amount currency } }
      unknown: product(slug: "no-such-product") { id }
    }`);

    assert.equal(answer.data.known.id, "product-03");
    assert.deepEqual(answer.data.known.price, { amount: 5599, currency: "EUR" });
    assert.equal(answer.data.unknown, null);
  });

  test("refuses a mutation that carries no origin before the resolver runs", async () => {
    const client = createClient(server.url);
    const answer = await client.run(
      `mutation { addToCart(productId: "product-18", quantity: 1) { cart { id } errors { code } } }`,
      {},
      { sendOrigin: false }
    );

    assert.equal(answer.data, null);
    assert.equal(answer.errors[0].extensions.code, "ORIGIN_NOT_ALLOWED");
    assert.equal(answer.status, 403);
  });

  test("refuses a mutation from an origin it does not allow", async () => {
    const client = createClient(server.url, { origin: "http://attacker.example" });
    const answer = await client.run(`mutation { removePromotionCode { cart { id } errors { code } } }`);

    assert.equal(answer.errors[0].extensions.code, "ORIGIN_NOT_ALLOWED");
  });

  test("lets a query through without an origin", async () => {
    const client = createClient(server.url);
    const answer = await client.run("{ categories { slug } }", {}, { sendOrigin: false });

    assert.equal(answer.errors, null);
    assert.equal(answer.data.categories.length, 4);
  });

  test("gives an anonymous visitor a cart cookie on the first cart mutation", async () => {
    const client = createClient(server.url);
    assert.equal(client.cookie("zappy_cart"), null);

    const added = await client.run(
      `mutation { addToCart(productId: "product-18", quantity: 2) {
        cart { id lines { quantity } subtotal { amount } shipping { amount } total { amount } }
        availableStock
        errors { code }
      } }`
    );

    assert.deepEqual(added.data.addToCart.errors, []);
    assert.equal(added.data.addToCart.availableStock, null);
    assert.equal(added.data.addToCart.cart.subtotal.amount, 1970);
    assert.equal(added.data.addToCart.cart.total.amount, 2465);
    assert.equal(client.cookie("zappy_cart"), added.data.addToCart.cart.id);

    const read = await client.run("{ cart { id lines { quantity } } }");
    assert.equal(read.data.cart.id, added.data.addToCart.cart.id);
    assert.equal(read.data.cart.lines[0].quantity, 2);
  });

  test("keeps two anonymous visitors apart", async () => {
    const first = createClient(server.url);
    const second = createClient(server.url);

    await first.run(`mutation { addToCart(productId: "product-18", quantity: 1) { errors { code } } }`);
    const secondCart = await second.run("{ cart { lines { quantity } } }");

    assert.deepEqual(secondCart.data.cart.lines, []);
  });

  test("names how many are left when a quantity passes the stock", async () => {
    const client = createClient(server.url);
    await client.run(`mutation { addToCart(productId: "product-12", quantity: 1) { errors { code } } }`);

    const answer = await client.run(
      `mutation { addToCart(productId: "product-12", quantity: 1) { availableStock errors { code field } } }`
    );

    assert.equal(answer.data.addToCart.errors[0].code, "OUT_OF_STOCK");
    assert.equal(answer.data.addToCart.availableStock, 1);
  });

  test("applies a promotion code and refuses an expired one", async () => {
    const client = createClient(server.url);
    await client.run(`mutation { addToCart(productId: "product-18", quantity: 2) { errors { code } } }`);

    const applied = await client.run(
      `mutation { applyPromotionCode(code: "welcome10") {
        cart { promotion { code kind discount { amount } } subtotal { amount } total { amount } }
        errors { code }
      } }`
    );
    assert.deepEqual(applied.data.applyPromotionCode.errors, []);
    assert.deepEqual(applied.data.applyPromotionCode.cart.promotion, {
      code: "WELCOME10",
      kind: "PERCENTAGE",
      discount: { amount: 197 }
    });
    assert.equal(applied.data.applyPromotionCode.cart.total.amount, 2268);

    const expired = await client.run(
      `mutation { applyPromotionCode(code: "SUMMER2025") { cart { promotion { code } } errors { code field } } }`
    );
    assert.equal(expired.data.applyPromotionCode.errors[0].code, "CODE_EXPIRED");
    assert.equal(expired.data.applyPromotionCode.errors[0].field, "code");
    assert.equal(expired.data.applyPromotionCode.cart.promotion.code, "WELCOME10");
  });

  test("drops the shipping to zero with a free shipping code", async () => {
    const client = createClient(server.url);
    await client.run(`mutation { addToCart(productId: "product-18", quantity: 2) { errors { code } } }`);

    const answer = await client.run(
      `mutation { applyPromotionCode(code: "FREESHIP") {
        cart { subtotal { amount } shipping { amount } total { amount } promotion { kind discount { amount } } }
        errors { code }
      } }`
    );

    const cart = answer.data.applyPromotionCode.cart;
    assert.equal(cart.subtotal.amount, 1970);
    assert.equal(cart.shipping.amount, 0);
    assert.equal(cart.total.amount, 1970);
    assert.deepEqual(cart.promotion, { kind: "FREE_SHIPPING", discount: { amount: 0 } });
  });

  test("registers a customer, signs them in and refuses a second registration on the same address", async () => {
    const client = createClient(server.url);
    const registered = await client.run(
      `mutation Register($input: RegisterInput!) {
        register(input: $input) { customer { id email name } accessToken accessTokenExpiresAt errors { code field } }
      }`,
      { input: { email: "New.Customer@Example.com", name: "New Customer", password: "a long enough password" } }
    );

    assert.deepEqual(registered.data.register.errors, []);
    assert.equal(registered.data.register.customer.email, "new.customer@example.com");
    assert.ok(registered.data.register.accessToken.length > 20);
    assert.match(registered.data.register.accessTokenExpiresAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    const again = await client.run(
      `mutation Register($input: RegisterInput!) { register(input: $input) { customer { id } errors { code field } } }`,
      { input: { email: "new.customer@example.com", name: "Someone Else", password: "a long enough password" } }
    );
    assert.equal(again.data.register.customer, null);
    assert.deepEqual(again.data.register.errors, [{ code: "EMAIL_TAKEN", field: "input.email" }]);
  });

  test("refuses a password that is too short and an address that is not an address", async () => {
    const client = createClient(server.url);
    const shortPassword = await client.run(
      `mutation Register($input: RegisterInput!) { register(input: $input) { errors { code field } } }`,
      { input: { email: "short@example.com", name: "Short", password: "too short" } }
    );
    assert.deepEqual(shortPassword.data.register.errors, [{ code: "PASSWORD_TOO_SHORT", field: "input.password" }]);

    const notAnAddress = await client.run(
      `mutation Register($input: RegisterInput!) { register(input: $input) { errors { code field } } }`,
      { input: { email: "not-an-address", name: "Nobody", password: "a long enough password" } }
    );
    assert.deepEqual(notAnAddress.data.register.errors, [{ code: "EMAIL_INVALID", field: "input.email" }]);
  });

  test("logs the seed customer in and sets an httpOnly refresh cookie", async () => {
    const client = createClient(server.url);
    const login = await signInSeedCustomer(client);

    assert.deepEqual(login.errors, []);
    assert.equal(login.customer.email, "jane@example.com");
    assert.equal(login.customer.name, "Jane Doe");
    assert.ok(client.cookie("zappy_refresh") !== null);

    const me = await client.run("{ me { id email sessions { device current } } }");
    assert.equal(me.data.me.id, "customer-01");
    assert.deepEqual(me.data.me.sessions, [{ device: "Node test runner", current: true }]);
  });

  test("answers one code for a wrong password and for an address nobody registered", async () => {
    const client = createClient(server.url);
    const wrongPassword = await client.run(
      `mutation Login($input: LoginInput!) { login(input: $input) { customer { id } errors { code field } } }`,
      { input: { email: "jane@example.com", password: "not the right password" } }
    );
    const unknownAddress = await client.run(
      `mutation Login($input: LoginInput!) { login(input: $input) { customer { id } errors { code field } } }`,
      { input: { email: "nobody@example.com", password: "not the right password" } }
    );

    assert.deepEqual(wrongPassword.data.login.errors, [{ code: "CREDENTIALS_INVALID", field: null }]);
    assert.deepEqual(unknownAddress.data.login.errors, [{ code: "CREDENTIALS_INVALID", field: null }]);
    assert.equal(wrongPassword.data.login.customer, null);
  });

  test("answers null for me and an empty wishlist when nobody is signed in", async () => {
    const client = createClient(server.url);
    const answer = await client.run("{ me { id } wishlist { id } orders { totalCount edges { node { id } } } }");

    assert.equal(answer.data.me, null);
    assert.deepEqual(answer.data.wishlist, []);
    assert.equal(answer.data.orders.totalCount, 0);
  });

  test("charges nothing at all for an empty cart", async () => {
    const client = createClient(server.url);
    const answer = await client.run(
      "{ cart { lines { id } subtotal { amount } shipping { amount } total { amount } } }"
    );

    assert.deepEqual(answer.data.cart.lines, []);
    assert.deepEqual(answer.data.cart.subtotal, { amount: 0 });
    assert.deepEqual(answer.data.cart.shipping, { amount: 0 });
    assert.deepEqual(answer.data.cart.total, { amount: 0 });
  });

  test("leaves the cart at nothing after the order that emptied it", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);
    await client.run(`mutation { addToCart(productId: "product-18", quantity: 2) { errors { code } } }`);
    await client.run("mutation { placeOrder { order { total { amount } } errors { code } } }");

    const answer = await client.run("{ cart { subtotal { amount } shipping { amount } total { amount } } }");

    assert.deepEqual(answer.data.cart, {
      subtotal: { amount: 0 },
      shipping: { amount: 0 },
      total: { amount: 0 }
    });
  });

  test("moves the anonymous cart to the customer on login", async () => {
    const client = createClient(server.url);
    await client.run(`mutation { addToCart(productId: "product-18", quantity: 2) { errors { code } } }`);
    await signInSeedCustomer(client);

    const answer = await client.run("{ cart { lines { quantity product { id } } subtotal { amount } } }");

    assert.deepEqual(answer.data.cart.lines, [{ quantity: 2, product: { id: "product-18" } }]);
    assert.equal(answer.data.cart.subtotal.amount, 1970);
    assert.equal(client.cookie("zappy_cart"), null);
  });

  test("exchanges the refresh cookie for a new access token and a new refresh token", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);
    const firstRefreshToken = client.cookie("zappy_refresh");

    const refreshed = await client.run(
      "mutation { refreshSession { customer { id } accessToken accessTokenExpiresAt errors { code } } }"
    );

    assert.deepEqual(refreshed.data.refreshSession.errors, []);
    assert.equal(refreshed.data.refreshSession.customer.id, "customer-01");
    assert.ok(refreshed.data.refreshSession.accessToken.length > 20);
    assert.notEqual(client.cookie("zappy_refresh"), firstRefreshToken);
  });

  test("answers a request with no refresh cookie with SESSION_INVALID", async () => {
    const answer = await createClient(server.url).run(
      "mutation { refreshSession { customer { id } errors { code field } } }"
    );

    assert.deepEqual(answer.data.refreshSession.errors, [{ code: "SESSION_INVALID", field: null }]);
  });

  test("revokes the whole family when a rotated refresh token comes back", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);
    const firstRefreshToken = client.cookie("zappy_refresh");

    await client.run("mutation { refreshSession { accessToken errors { code } } }");
    const secondRefreshToken = client.cookie("zappy_refresh");

    const replay = await refreshWithCookie(server.url, firstRefreshToken);
    assert.deepEqual(replay.data.refreshSession.errors, [{ code: "SESSION_INVALID" }]);

    const afterRevocation = await refreshWithCookie(server.url, secondRefreshToken);
    assert.deepEqual(afterRevocation.data.refreshSession.errors, [{ code: "SESSION_INVALID" }]);
  });

  test("logs out, clears the refresh cookie and answers a second logout with success", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);

    const first = await client.run("mutation { logout { success errors { code } } }");
    assert.deepEqual(first.data.logout, { success: true, errors: [] });
    assert.equal(client.cookie("zappy_refresh"), null);

    const second = await client.run("mutation { logout { success errors { code } } }");
    assert.deepEqual(second.data.logout, { success: true, errors: [] });
  });

  test("stops accepting the access token of a revoked session", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);
    assert.equal((await client.run("{ me { id } }")).data.me.id, "customer-01");

    await client.run("mutation { logout { success errors { code } } }");

    const afterwards = await client.run(
      `{ me { id } } `
    );
    assert.equal(afterwards.data.me, null);

    const revoking = await client.run(
      `mutation { revokeSession(sessionId: "session-anything") { sessions { id } errors { code field } } }`
    );
    assert.deepEqual(revoking.data.revokeSession, {
      sessions: [],
      errors: [{ code: "NOT_AUTHENTICATED", field: null }]
    });
  });

  test("revokes one session by its id and refuses an id of another customer", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);

    const other = createClient(server.url);
    await signInSeedCustomer(other);

    const listed = await client.run("{ me { sessions { id device current } } }");
    assert.equal(listed.data.me.sessions.length, 2);

    const notMine = await client.run(
      `mutation { revokeSession(sessionId: "session-nothing") { sessions { id } errors { code field } } }`
    );
    assert.deepEqual(notMine.data.revokeSession.errors, [{ code: "SESSION_NOT_FOUND", field: "sessionId" }]);

    const notSignedIn = createClient(server.url);
    const refused = await notSignedIn.run(
      `mutation { revokeSession(sessionId: "session-nothing") { sessions { id } errors { code } } }`
    );
    assert.deepEqual(refused.data.revokeSession.errors, [{ code: "NOT_AUTHENTICATED" }]);

    const target = listed.data.me.sessions.find((session) => !session.current);
    const revoked = await client.run(
      `mutation Revoke($sessionId: ID!) { revokeSession(sessionId: $sessionId) { sessions { id current } errors { code } } }`,
      { sessionId: target.id }
    );
    assert.deepEqual(revoked.data.revokeSession.errors, []);
    assert.equal(revoked.data.revokeSession.sessions.length, 1);
    assert.equal(revoked.data.revokeSession.sessions[0].current, true);
  });

  test("keeps an anonymous wishlist against the cart cookie", async () => {
    const client = createClient(server.url);

    const added = await client.run(
      `mutation { addToWishlist(productId: "product-05") { products { id slug } errors { code } } }`
    );
    assert.deepEqual(added.data.addToWishlist.errors, []);
    assert.deepEqual(added.data.addToWishlist.products, [
      { id: "product-05", slug: "john-hardy-legends-naga-dragon-station-chain-bracelet" }
    ]);
    assert.ok(client.cookie("zappy_cart") !== null);

    const read = await client.run("{ wishlist { id } }");
    assert.deepEqual(read.data.wishlist, [{ id: "product-05" }]);

    const removed = await client.run(
      `mutation { removeFromWishlist(productId: "product-05") { products { id } errors { code } } }`
    );
    assert.deepEqual(removed.data.removeFromWishlist, { products: [], errors: [] });

    const somebodyElse = createClient(server.url);
    const theirs = await somebodyElse.run("{ wishlist { id } }");
    assert.deepEqual(theirs.data.wishlist, []);
  });

  test("merges the anonymous wishlist into the customer on login", async () => {
    const client = createClient(server.url);
    const answer = await client.run(
      `mutation MergeOnLogin($input: LoginInput!) {
        addToWishlist(productId: "product-06") { products { id } errors { code } }
        login(input: $input) { customer { id wishlist { id slug } } accessToken errors { code } }
      }`,
      { input: { email: "jane@example.com", password: "correct horse battery staple", device: "Node test runner" } }
    );

    assert.deepEqual(answer.data.addToWishlist.products, [{ id: "product-06" }]);
    assert.deepEqual(answer.data.login.errors, []);
    assert.deepEqual(answer.data.login.customer.wishlist, [
      { id: "product-06", slug: "solid-gold-petite-micropave" }
    ]);
    assert.equal(client.cookie("zappy_cart"), null);
  });

  test("keeps the wishlist of a signed in customer", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);

    const added = await client.run(
      `mutation { addToWishlist(productId: "product-05") { products { id } errors { code } } }`
    );
    assert.deepEqual(added.data.addToWishlist.products, [{ id: "product-05" }]);

    const again = await client.run(
      `mutation { addToWishlist(productId: "product-05") { products { id } errors { code } } }`
    );
    assert.deepEqual(again.data.addToWishlist.products, [{ id: "product-05" }]);

    const second = await client.run(
      `mutation { addToWishlist(productId: "product-01") { products { id } errors { code } } }`
    );
    assert.deepEqual(second.data.addToWishlist.products, [{ id: "product-01" }, { id: "product-05" }]);

    const unknown = await client.run(
      `mutation { addToWishlist(productId: "product-99") { products { id } errors { code field } } }`
    );
    assert.deepEqual(unknown.data.addToWishlist.errors, [{ code: "PRODUCT_NOT_FOUND", field: "productId" }]);

    const removed = await client.run(
      `mutation { removeFromWishlist(productId: "product-01") { products { id } errors { code } } }`
    );
    assert.deepEqual(removed.data.removeFromWishlist.products, [{ id: "product-05" }]);

    const removedAgain = await client.run(
      `mutation { removeFromWishlist(productId: "product-01") { products { id } errors { code } } }`
    );
    assert.deepEqual(removedAgain.data.removeFromWishlist.errors, []);

    const read = await client.run("{ wishlist { id } me { wishlist { id } } }");
    assert.deepEqual(read.data.wishlist, [{ id: "product-05" }]);
    assert.deepEqual(read.data.me.wishlist, [{ id: "product-05" }]);
  });

  test("places an order, empties the cart and lists it newest first", async () => {
    const anonymous = createClient(server.url);
    const refused = await anonymous.run("mutation { placeOrder { order { id } errors { code } } }");
    assert.deepEqual(refused.data.placeOrder.errors, [{ code: "NOT_AUTHENTICATED" }]);

    const client = createClient(server.url);
    await signInSeedCustomer(client);

    const emptyCart = await client.run("mutation { placeOrder { order { id } errors { code } } }");
    assert.deepEqual(emptyCart.data.placeOrder.errors, [{ code: "CART_EMPTY" }]);

    await client.run(`mutation { addToCart(productId: "product-18", quantity: 2) { errors { code } } }`);
    await client.run(`mutation { applyPromotionCode(code: "WELCOME10") { errors { code } } }`);

    const placed = await client.run(
      `mutation PlaceOrder($idempotencyKey: String) {
        placeOrder(idempotencyKey: $idempotencyKey) {
          order {
            id number status promotionCode placedAt
            lines { productName unitPrice { amount } quantity lineTotal { amount } }
            subtotal { amount } discount { amount } shipping { amount } total { amount }
          }
          errors { code }
        }
      }`,
      { idempotencyKey: "checkout-one" }
    );

    const order = placed.data.placeOrder.order;
    assert.deepEqual(placed.data.placeOrder.errors, []);
    assert.equal(order.status, "PAID");
    assert.equal(order.promotionCode, "WELCOME10");
    assert.deepEqual(order.subtotal, { amount: 1970 });
    assert.deepEqual(order.discount, { amount: 197 });
    assert.deepEqual(order.shipping, { amount: 495 });
    assert.deepEqual(order.total, { amount: 2268 });
    assert.match(order.placedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    const afterwards = await client.run(
      `{
        cart { lines { quantity } promotion { code } }
        orders { totalCount edges { cursor node { id number } } }
        order(id: "${order.id}") { id number }
        product(slug: "mbj-womens-solid-short-sleeve-boat-neck-v") { stock }
      }`
    );
    assert.deepEqual(afterwards.data.cart.lines, []);
    assert.equal(afterwards.data.cart.promotion, null);
    assert.equal(afterwards.data.orders.totalCount, 1);
    assert.equal(afterwards.data.orders.edges[0].node.id, order.id);
    assert.equal(afterwards.data.order.number, order.number);
    assert.equal(afterwards.data.product.stock, 23);

    const retried = await client.run(
      `mutation { placeOrder(idempotencyKey: "checkout-one") { order { id } errors { code } } }`
    );
    assert.deepEqual(retried.data.placeOrder.errors, [{ code: "CART_EMPTY" }]);
  });

  test("answers an order of another customer with null", async () => {
    const jane = createClient(server.url);
    await signInSeedCustomer(jane);
    await jane.run(`mutation { addToCart(productId: "product-19", quantity: 1) { errors { code } } }`);
    const placed = await jane.run("mutation { placeOrder { order { id } errors { code } } }");

    const someoneElse = createClient(server.url);
    const registered = await someoneElse.run(
      `mutation Register($input: RegisterInput!) { register(input: $input) { accessToken errors { code } } }`,
      { input: { email: "someone.else@example.com", name: "Someone Else", password: "a long enough password" } }
    );
    someoneElse.accessToken = registered.data.register.accessToken;

    const answer = await someoneElse.run(
      `{ order(id: "${placed.data.placeOrder.order.id}") { id } orders { totalCount } }`
    );

    assert.equal(answer.data.order, null);
    assert.equal(answer.data.orders.totalCount, 0);
  });

  test("resets every cart, order and session back to the seed", async () => {
    const client = createClient(server.url);
    await signInSeedCustomer(client);
    await client.run(`mutation { addToCart(productId: "product-12", quantity: 1) { errors { code } } }`);
    await client.run("mutation { placeOrder { order { id } errors { code } } }");

    const reset = await createClient(server.url).run(
      "mutation { resetSeed { success loadedProducts errors { code } } }"
    );
    assert.deepEqual(reset.data.resetSeed, { success: true, loadedProducts: 20, errors: [] });

    const answer = await createClient(server.url).run(
      `{ product(slug: "wd-4tb-gaming-drive-playstation-4") { stock } cart { lines { quantity } } }`
    );
    assert.equal(answer.data.product.stock, 1);
    assert.deepEqual(answer.data.cart.lines, []);
  });

  test("answers the allowed origin with credentials for the browser", async () => {
    const preflight = await fetch(server.url, {
      method: "OPTIONS",
      headers: { origin: testOrigin, "access-control-request-method": "POST" }
    });

    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), testOrigin);
    assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");

    const foreign = await fetch(server.url, {
      method: "OPTIONS",
      headers: { origin: "http://attacker.example", "access-control-request-method": "POST" }
    });
    assert.equal(foreign.headers.get("access-control-allow-origin"), null);
  });
});
