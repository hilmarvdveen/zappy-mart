import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const folder = mkdtempSync(join(tmpdir(), "zappy-walkthrough-"));
for (const name of ["CATALOGUE", "CART", "PROMOTIONS", "ORDERING", "ACCOUNTS"]) {
  process.env[`ZAPPY_${name}_SQLITE_FILE`] = join(folder, `${name.toLowerCase()}.sqlite`);
}
process.env.ZAPPY_PROFILE = "development";

const { startAccounts } = await import("../subgraphs/accounts/distribution/src/host/main.js");
const { startCatalogue } = await import("../subgraphs/catalogue/distribution/src/host/main.js");
const { startCart } = await import("../subgraphs/cart/distribution/src/host/main.js");
const { startPromotions } = await import("../subgraphs/promotions/distribution/src/host/main.js");
const { startOrdering } = await import("../subgraphs/ordering/distribution/src/host/main.js");
const { startGateway } = await import("../router/distribution/src/host/main.js");

const running = [
  await startAccounts(),
  await startCatalogue(),
  await startCart(),
  await startPromotions(),
  await startOrdering(),
  await startGateway()
];

const cookies = new Map();
let accessToken = null;

async function ask(label, query, variables = {}, options = {}) {
  const headers = { "content-type": "application/json" };
  if (options.origin !== null) {
    headers.origin = options.origin ?? "http://localhost:5173";
  }
  if (accessToken !== null) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  if (cookies.size > 0) {
    headers.cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }
  const response = await fetch("http://localhost:4100/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";")[0];
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    const stored = pair.slice(separator + 1);
    if (stored.length === 0) {
      cookies.delete(name);
    } else {
      cookies.set(name, stored);
    }
  }
  const body = await response.json();
  console.log(`\n=====${label}=====`);
  console.log("QUERY:", query.trim());
  if (Object.keys(variables).length > 0) {
    console.log("VARIABLES:", JSON.stringify(variables));
  }
  console.log("STATUS:", response.status);
  const cookieHeaders = response.headers.getSetCookie();
  if (cookieHeaders.length > 0) {
    console.log("SET-COOKIE:", JSON.stringify(cookieHeaders));
  }
  console.log("ANSWER:", JSON.stringify(body, null, 2));
  return body;
}

await ask("resetSeed", "mutation { resetSeed { success loadedProducts errors { code } } }");

await ask(
  "products",
  `{
  products(first: 2, filter: { categorySlug: "electronics", inStockOnly: true }) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges { cursor node { id name slug price { amount currency } stock category { name slug } imageUrl } }
  }
}`
);

await ask("product", '{ product(slug: "mens-cotton-jacket") { id name price { amount currency } stock category { slug } } }');
await ask("categories", "{ categories { id name slug } }");
await ask("cartEmpty", "{ cart { id lines { id } subtotal { amount } shipping { amount } total { amount } } }");

const cartFields = `cart {
      id
      lines { id quantity product { id name price { amount } } lineTotal { amount currency } }
      promotion { code kind discount { amount } }
      subtotal { amount }
      shipping { amount }
      total { amount }
      updatedAt
    }
    availableStock
    errors { code message field }`;

await ask(
  "addToCart",
  `mutation AddToCart($productId: ID!, $quantity: Int) {
  addToCart(productId: $productId, quantity: $quantity) {
    ${cartFields}
  }
}`,
  { productId: "product-18", quantity: 2 }
);

const withLine = await ask("cartAfterAdding", `{ cart { id lines { id quantity } subtotal { amount } shipping { amount } total { amount } } }`);
const lineId = withLine.data.cart.lines[0].id;

await ask(
  "changeCartLineQuantity",
  `mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {
  changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {
    ${cartFields}
  }
}`,
  { lineId, quantity: 3 }
);

await ask(
  "addToCartOutOfStock",
  `mutation AddToCart($productId: ID!, $quantity: Int) {
  addToCart(productId: $productId, quantity: $quantity) {
    ${cartFields}
  }
}`,
  { productId: "product-12", quantity: 2 }
);

await ask(
  "applyPromotionCode",
  `mutation ApplyPromotionCode($code: String!) {
  applyPromotionCode(code: $code) {
    ${cartFields}
  }
}`,
  { code: "freeship" }
);

await ask(
  "applyPromotionCodeExpired",
  `mutation ApplyPromotionCode($code: String!) {
  applyPromotionCode(code: $code) {
    ${cartFields}
  }
}`,
  { code: "SUMMER2025" }
);

await ask("removePromotionCode", `mutation { removePromotionCode { ${cartFields} } }`);

await ask(
  "removeCartLine",
  `mutation RemoveCartLine($lineId: ID!) {
  removeCartLine(lineId: $lineId) {
    ${cartFields}
  }
}`,
  { lineId }
);

await ask(
  "mutationWithoutOrigin",
  `mutation AddToCart($productId: ID!) { addToCart(productId: $productId) { ${cartFields} } }`,
  { productId: "product-18" },
  { origin: null }
);

await ask(
  "register",
  `mutation Register($input: RegisterInput!) {
  register(input: $input) {
    customer { id email name createdAt }
    accessToken
    accessTokenExpiresAt
    errors { code message field }
  }
}`,
  { input: { email: "sam@example.com", name: "Sam Visser", password: "correct horse battery" } }
);

await ask(
  "registerDuplicate",
  `mutation Register($input: RegisterInput!) {
  register(input: $input) { customer { id } accessToken errors { code message field } }
}`,
  { input: { email: "jane@example.com", name: "Jane Twice", password: "correct horse battery" } }
);

await ask(
  "addToWishlistAnonymously",
  `mutation AddToWishlist($productId: ID!) {
  addToWishlist(productId: $productId) { products { id name } errors { code message } }
}`,
  { productId: "product-05" }
);

const login = await ask(
  "login",
  `mutation Login($input: LoginInput!) {
  login(input: $input) {
    customer { id email name sessions { id device createdAt lastUsedAt current } wishlist { id name } }
    accessToken
    accessTokenExpiresAt
    errors { code message }
  }
}`,
  {
    input: { email: "jane@example.com", password: "correct horse battery staple", device: "Chrome on Windows" }
  }
);
accessToken = login.data.login.accessToken;
const sessionId = login.data.login.customer.sessions[0].id;

await ask(
  "loginWrongPassword",
  `mutation Login($input: LoginInput!) { login(input: $input) { customer { id } accessToken errors { code message } } }`,
  { input: { email: "jane@example.com", password: "not the password" } }
);

await ask("me", "{ me { id email name createdAt sessions { id device current } wishlist { id name } } }");
await ask("wishlist", "{ wishlist { id name price { amount } } }");

await ask(
  "removeFromWishlist",
  `mutation RemoveFromWishlist($productId: ID!) {
  removeFromWishlist(productId: $productId) { products { id name } errors { code } }
}`,
  { productId: "product-05" }
);

await ask("refreshSession", "mutation { refreshSession { accessToken accessTokenExpiresAt errors { code message } } }");

await ask(
  "addToCartSignedIn",
  `mutation AddToCart($productId: ID!, $quantity: Int) { addToCart(productId: $productId, quantity: $quantity) { ${cartFields} } }`,
  { productId: "product-18", quantity: 2 }
);

await ask(
  "placeOrder",
  `mutation PlaceOrder($idempotencyKey: String) {
  placeOrder(idempotencyKey: $idempotencyKey) {
    order {
      id number status placedAt promotionCode
      lines { productName unitPrice { amount } quantity lineTotal { amount } }
      subtotal { amount } discount { amount } shipping { amount } total { amount }
    }
    errors { code message }
  }
}`,
  { idempotencyKey: "checkout-2026-09-09-jane-1" }
);

await ask(
  "placeOrderReplayed",
  `mutation PlaceOrder($idempotencyKey: String) {
  placeOrder(idempotencyKey: $idempotencyKey) { order { id number total { amount } } errors { code message } }
}`,
  { idempotencyKey: "checkout-2026-09-09-jane-1" }
);

await ask(
  "placeOrderEmptyCart",
  `mutation PlaceOrder($idempotencyKey: String) {
  placeOrder(idempotencyKey: $idempotencyKey) { order { id } errors { code message } }
}`,
  { idempotencyKey: "checkout-2026-09-09-jane-2" }
);

const orders = await ask(
  "orders",
  `{ orders(first: 5) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id number status total { amount } placedAt } } } }`
);
const orderId = orders.data.orders.edges[0].node.id;

await ask(
  "order",
  `query Order($id: ID!) {
  order(id: $id) {
    id number status
    lines { productName unitPrice { amount } quantity lineTotal { amount } }
    subtotal { amount } discount { amount } shipping { amount } total { amount } placedAt
  }
}`,
  { id: orderId }
);

await ask(
  "revokeSession",
  `mutation RevokeSession($sessionId: ID!) {
  revokeSession(sessionId: $sessionId) { sessions { id device current } errors { code message } }
}`,
  { sessionId }
);

await ask("meAfterRevocation", "{ me { id email } }");

accessToken = null;
await ask("logout", "mutation { logout { success errors { code } } }");

console.log("\n=====jwks=====");
const jwks = await fetch("http://localhost:4105/.well-known/jwks.json");
console.log("GET http://localhost:4105/.well-known/jwks.json");
console.log("STATUS:", jwks.status);
const jwksBody = await jwks.json();
console.log("ANSWER:", JSON.stringify({ keys: jwksBody.keys.map((key) => ({ ...key, n: `${key.n.slice(0, 24)}...` })) }, null, 2));

console.log("\n=====health=====");
for (const [label, url] of [
  ["gateway health", "http://localhost:4100/health"],
  ["gateway readiness", "http://localhost:4100/ready"],
  ["catalogue health", "http://localhost:4101/health"],
  ["catalogue readiness", "http://localhost:4101/ready"]
]) {
  const response = await fetch(url);
  console.log(`${label}: GET ${url} -> ${response.status} ${await response.text()}`);
}

console.log("\n=====payment webhook=====");
const webhook = await fetch("http://localhost:4104/webhooks/payment", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ orderNumber: "ZM-000001", status: "settled", reference: "simulated-payment-01" })
});
console.log("POST http://localhost:4104/webhooks/payment");
console.log("STATUS:", webhook.status);
console.log("ANSWER:", await webhook.text());

for (const part of running.reverse()) {
  await part.stop();
}
rmSync(folder, { recursive: true, force: true });
process.exit(0);
