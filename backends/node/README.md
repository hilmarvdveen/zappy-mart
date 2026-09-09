# Zappy Mart as a federated graph

The three monoliths in `backends/` show one store as five modules in one
process. This backend shows the same store as five services behind one graph.
A client cannot tell the difference: the composed API schema equals
`contract/schema.graphql` exactly, and `tools/contract-diff.mjs` fails the
build when it does not.

Item Z11a in `BACKLOG.md`, designed in `docs/federation.md`.

## What you get

| Part | Port | Owns |
|---|---|---|
| gateway | 4100 | the supergraph, header propagation, CORS, per subgraph timeouts, depth and cost limits |
| `catalogue` | 4101 | `Product`, `Category`, stock, the internal stock reservation |
| `cart` | 4102 | `Cart`, `CartLine`, the anonymous cart |
| `promotions` | 4103 | `PromotionCode`, the three rules, `Cart.promotion`, `Cart.shipping`, `Cart.total` |
| `ordering` | 4104 | `Order`, `OrderLine`, `placeOrder`, the outbox |
| `accounts` | 4105 | `Customer`, `Session`, the wishlist, the tokens, the signing keys |

Every subgraph is a small hexagon in TypeScript: `domain/` with no framework
import, `application/` with the use cases and their ports, `adapters/` with
GraphQL in and the database and the other subgraphs out, and `host/` with the
wiring.

## From an empty folder to a running graph

### 1. What you need

Node.js 24. Nothing else. No Docker, no database server, no Rust binary. Each
subgraph keeps its own SQLite file through `node:sqlite`, which is built into
Node 24. The PostgreSQL 18 profile is a configuration change and is described
at the end.

```
node --version
```

### 2. Install

```
cd backends/node
npm install
```

That installs one npm workspace per part. `argon2` ships a prebuilt binding, so
nothing is compiled.

### 3. Generate the typed resolvers

```
npm run generate
```

`tools/generate-resolver-types.mjs` reads every `subgraphs/<name>/schema.graphql`
and its development extension and writes
`subgraphs/<name>/src/generated/resolvers.ts`. A resolver that returns the wrong
shape does not compile. The generated file is committed, so a fresh checkout
builds without this step.

### 4. Compose the supergraph

```
npm run compose
```

`tools/compose.mjs` calls `composeServices` from `@apollo/composition` on the
five subgraph schemas and writes `router/supergraph.graphql` (production) and
`router/supergraph.development.graphql` (the same graph plus `resetSeed`). A
composition error stops the script and names the field.

### 5. Prove the contract

```
npm run contract-diff
```

```
the production graph matches the contract
the development graph matches the contract
```

`tools/contract-diff.mjs` takes the composed supergraph, extracts the API
schema with `@apollo/federation-internals`, and compares every type, field,
argument, default value and enum value with `contract/schema.graphql`. It
ignores descriptions and ordering, because the contract carries the prose and
the subgraph schemas carry the shape. The development profile is compared with
`contract/schema.graphql` plus `contract/schema.development.graphql`.

### 6. Build and test

```
npm run build
npm test
```

```
tests 162
suites 31
pass 162
fail 0
```

`npm test` runs `node:test` over the compiled tests: the domain rules and the
resolvers of every subgraph against an in-memory store, plus one integration
run that starts all five subgraphs and the gateway in one process and drives
the whole store through `http://localhost:4100/graphql`.

### 7. Start the graph

```
npm start
```

```
[catalogue] catalogue is serving http://localhost:4101/graphql
[cart] cart is serving http://localhost:4102/graphql
[promotions] promotions is serving http://localhost:4103/graphql
[ordering] ordering is serving http://localhost:4104/graphql
[accounts] accounts is serving http://localhost:4105/graphql
[gateway] the graph is serving http://localhost:4100/graphql
the graph is ready on http://localhost:4100/graphql
```

`tools/start-graph.mjs` starts the five subgraphs, waits until each answers
`/health`, and only then starts the gateway. Every part can also be started on
its own with `npm start --workspace @zappy/catalogue` and so on.

### 8. Run the shared conformance suite

```
node tools/run-conformance.mjs
```

```
34 documents match contract/schema.graphql and contract/schema.development.graphql
seed loaded, 20 products
   1/33  catalogue-list                  matches
   2/33  catalogue-filter-by-category    matches
   ...
  33/33  mutation-without-origin         matches
33 of 33 scenarios matched contract/expected
```

That script starts the whole graph in one process and points the runner in
`tools/conformance/` at `http://localhost:4100/graphql`. The runner resets the
seed, runs every document in `contract/operations/` in order and compares each
answer with `contract/expected/`. It is the same suite the C#, Java and Kotlin
backends run, which is what makes this backend one of the family rather than a
variant. Against a graph that is already running, call the runner directly from
the repository root:

```
node tools/conformance/run.mjs --url http://localhost:4100/graphql
```

## The five subgraphs, one at a time

### catalogue, port 4101

Owns `Product`, `Category` and the stock. It is the only subgraph that resolves
a `Product` by its key, so every other subgraph that shows a product returns
`{ id }` and the gateway fills the rest in.

```
subgraphs/catalogue/
  schema.graphql                     Product, Category, the catalogue queries, the internal stock mutations
  schema.development.graphql         resetSeed and the internal per subgraph reset
  src/domain/product.ts              the stock rules
  src/domain/productSpecification.ts the filter, composed from parts
  src/domain/stockReservation.ts     all or nothing across the lines of one order
  src/application/ports.ts           ProductRepository, CategoryRepository, StockReservationStore
  src/application/readCatalogue.ts   paging in the seed order
  src/application/reserveStock.ts    the reservation with its idempotency key
  src/application/resetSeed.ts       reloads the seed and fans out to the other four
  src/adapters/persistence/          the tables and the SQL repositories
  src/adapters/graphql/              the models, the context, the loaders, the resolvers
  src/host/main.ts                   the wiring
```

`Mutation.reserveStock` and `Mutation.releaseStock` carry `@inaccessible`, so
they are composed into the supergraph and removed from the API schema. They are
reachable only by a caller that talks to port 4101 directly, which is what
`ordering` does. That is how an internal capability lives inside a federated
graph without leaking into the contract.

`Product.__resolveReference` reads through a DataLoader that is built per
request, so a cart with twenty lines costs the catalogue one database read and
not twenty.

### cart, port 4102

Owns `Cart` and `CartLine`. It keeps the product id and the quantity and
nothing else: the price comes from `catalogue` at the moment of the answer,
because `docs/domain.md` says the cart total is derived and never stored.

```
subgraphs/cart/
  src/domain/cart.ts                               lines, quantities, the subtotal
  src/application/changeCart.ts                    the four cart use cases
  src/adapters/catalogue/entityCatalogueReader.ts  reads Product through the entity reference, batched
  src/adapters/persistence/                        the tables and the SQL repository
```

An anonymous visitor is identified by the `zappy_cart` cookie, which the cart
subgraph sets on the first cart mutation. A signed in customer cart is found
through the access token instead. `Mutation.mergeAnonymousCart` is
`@inaccessible` and is what `accounts` calls on login.

### promotions, port 4103

Owns the codes and, with them, three fields of an entity somebody else owns:

```graphql
type Cart @key(fields: "id") {
  id: ID!
  subtotal: Money! @external
  promotion: AppliedPromotion @requires(fields: "subtotal { amount currency }")
  shipping: Money! @requires(fields: "subtotal { amount currency }")
  total: Money! @requires(fields: "subtotal { amount currency }")
}
```

`cart` owns `Cart.subtotal`. The gateway reads it there, hands it to
`promotions` inside the entity representation, and `promotions` answers the
discount, the shipping and the total. That is why the totals rule lives in
exactly one file, `subgraphs/promotions/src/domain/totals.ts`, and why
`ordering` copies the amounts instead of working them out again.

The rule, from the Ordering section of `docs/domain.md`, with the empty cart
added on 9 September 2026: shipping is 495 cents, and it is zero when the cart
is empty, when the subtotal reaches 5000, or when a free shipping code applies.
`total = subtotal + shipping - discount` holds in every case, because a free
shipping code has a discount of zero.

The three kinds of code are three implementations of one `PromotionRule`
interface in `src/domain/promotionRule.ts`. A fourth kind is one more file and
one more branch in `ruleOf`.

### ordering, port 4104

Owns `Order`, `OrderLine` and the outbox. `placeOrder` is the one place in this
backend where the distributed story is visible, so here it is step by step.

1. No customer in the access token, so `NOT_AUTHENTICATED`.
2. The idempotency key already has an order, so that order is answered again
   and nothing else happens.
3. `ordering` reads the cart of the visitor from `cart`: the id, the lines and
   the subtotal.
4. `ordering` reads the product names and the prices of the moment from
   `catalogue` through `_entities`, one call for every line together.
5. `ordering` reads the promotion, the shipping and the total from `promotions`
   through `_entities`, with the subtotal inside the representation, which is
   exactly what the `@requires` above asks for.
6. `ordering` reserves the stock in `catalogue` with the same idempotency key.
   Either every line is reserved or none is, and a refusal names the product.
7. In one database transaction the order, its lines and one outbox row are
   written together. If that transaction fails, the reservation is released, so
   no stock is ever held without its order.
8. After the commit the consumers run: the cart is emptied, its promotion is
   cleared, the use of the code is counted in `promotions`, and the confirmation
   mail is addressed by reading `Customer` from `accounts` through its entity
   reference.

```
subgraphs/ordering/
  src/domain/order.ts                              the factory that places an order, and the equation
  src/domain/orderPlaced.ts                        the event
  src/application/placeOrder.ts                    the eight steps above
  src/adapters/graph/graphCartReader.ts            the three reads of steps 3, 4 and 5
  src/adapters/graph/graphStockReserver.ts         the reservation and its release
  src/adapters/graph/graphOrderPlacedConsumers.ts  the consumers of step 8
  src/adapters/persistence/sqlOutboxStore.ts       the outbox table
```

### accounts, port 4105

Owns customers, sessions, the wishlist and the tokens.

```
subgraphs/accounts/
  src/domain/customer.ts                         the password rules
  src/domain/session.ts                          the session, the refresh token, the replay verdict
  src/domain/wishlist.ts                         add, remove, and the merge that only ever adds
  src/application/authenticate.ts                register, login, refresh, logout
  src/application/manageSessions.ts              the session list, the revocation, the liveness check
  src/application/manageWishlist.ts              the wishlist for a customer or for a visitor
  src/adapters/security/argon2PasswordHasher.ts  Argon2id with the OWASP parameters
  src/adapters/security/rsaTokenIssuer.ts        the keys, the JWT and the JSON web key set
```

## The three HTTP edges outside the graph

The client facing side of this backend is GraphQL only. Three edges stay on
plain HTTP on purpose, because they are machine to machine.

**Health and readiness.** Every subgraph and the gateway answer `GET /health`
(the process is up) and `GET /ready` (it can do its work). The readiness of the
gateway asks all five.

```
GET http://localhost:4100/health
200 {"gateway":"zappy-mart","status":"alive"}

GET http://localhost:4100/ready
200 {"gateway":"zappy-mart","subgraphs":[{"name":"catalogue","ready":true},{"name":"cart","ready":true},{"name":"promotions","ready":true},{"name":"ordering","ready":true},{"name":"accounts","ready":true}]}

GET http://localhost:4101/health
200 {"subgraph":"catalogue","status":"alive"}

GET http://localhost:4101/ready
200 {"subgraph":"catalogue","status":"ready"}
```

**The JSON web key set.** `accounts` generates an RSA key pair at start and
publishes the public half. Every other subgraph verifies an access token
against this document and trusts nothing else.

```
GET http://localhost:4105/.well-known/jwks.json
200
{
  "keys": [
    {
      "kty": "RSA",
      "n": "s1wYM_6kEOtBF6zcgiCfrUhY...",
      "e": "AQAB",
      "kid": "rhR_UogcDUbyQtN8",
      "alg": "RS256",
      "use": "sig"
    }
  ]
}
```

**The simulated payment webhook.** A payment provider calls back over HTTP, not
GraphQL, so `ordering` keeps one route for it. Payment is simulated in this
store, so the route records what it was told and answers 202.

```
POST http://localhost:4104/webhooks/payment
{"orderNumber":"ZM-000001","status":"settled","reference":"simulated-payment-01"}

202 {"received":true}
```

## Security

The model is `docs/security.md`, distributed as `docs/federation.md` asks.

**Two tokens.** `accounts` issues an RS256 access token that lives fifteen
minutes and carries the customer id, the session id and nothing personal. The
refresh token is random, thirty days, stored as a SHA-256 hash in the session
store and never in a payload.

**Distributed verification.** Every subgraph verifies the access token against
the JSON web key set of `accounts` with `jose`, and then asks `accounts` whether
that session id is still live, with the answer cached for five seconds. So a
logout or a revocation takes effect at once and no subgraph is a gate for
another. The gateway only forwards the header.

**Rotation with family revocation.** A refresh token is used once. Presenting a
rotated token again means it leaked, so the session is revoked and every token
of that session is marked rotated.

**Cookies.** `zappy_refresh` is httpOnly, SameSite Lax and limited to the path
of the refresh mutation. `zappy_cart` identifies the anonymous cart in `cart`
and the anonymous wishlist in `accounts`. Both are set by the subgraph that owns
them, and the gateway hands the `set-cookie` header back to the browser.

**The origin check.** Every mutation is refused before any resolver runs when
the `Origin` header is missing or is not one of the three frontend origins. The
check sits in the gateway and again in every subgraph, so a caller that reaches
a subgraph directly meets the same rule.

**Passwords.** Argon2id through `argon2` 0.45.1, with the parameters the OWASP
password storage cheat sheet gives as its first choice: memory 19456 KiB,
iterations 2, parallelism 1. A password shorter than twelve characters or longer
than one hundred and twenty eight is refused. A failed login answers
`CREDENTIALS_INVALID` whether or not the address is registered, and verifies
against a fixed hash when it is not, so the two answers take the same time.

**Rate limits.** Login and register count attempts per caller and per email
address, twenty in a minute, and answer `RATE_LIMITED` above that.

## One request per operation, with its answer

Every pair below was captured from a running graph on 9 September 2026. Send
them to `http://localhost:4100/graphql` with `content-type: application/json`
and, for a mutation, `origin: http://localhost:5173`. Opaque values that differ
per run (ids, cookies, tokens) are shortened here.
`tools/capture-walkthrough.mjs` starts the graph and prints every pair again.

### resetSeed, the development profile only

```graphql
mutation { resetSeed { success loadedProducts errors { code } } }
```

```json
{ "data": { "resetSeed": { "success": true, "loadedProducts": 20, "errors": [] } } }
```

The gateway routes it to `catalogue`, which reloads its own tables and then
calls the internal reset of the other four. That is what "resets every subgraph
through the router" means in a federated graph.

### products

```graphql
{
  products(first: 2, filter: { categorySlug: "electronics", inStockOnly: true }) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges { cursor node { id name slug price { amount currency } stock category { name slug } imageUrl } }
  }
}
```

```json
{
  "data": {
    "products": {
      "totalCount": 6,
      "pageInfo": { "hasNextPage": true, "endCursor": "cHJvZHVjdC0xMA" },
      "edges": [
        {
          "cursor": "cHJvZHVjdC0wOQ",
          "node": {
            "id": "product-09",
            "name": "WD 2TB Elements Portable External Hard Drive, USB 3.0",
            "slug": "wd-2tb-elements-portable-external-hard-drive",
            "price": { "amount": 6400, "currency": "EUR" },
            "stock": 15,
            "category": { "name": "Electronics", "slug": "electronics" },
            "imageUrl": "/images/products/wd-2tb-elements-portable-external-hard-drive.svg"
          }
        },
        {
          "cursor": "cHJvZHVjdC0xMA",
          "node": {
            "id": "product-10",
            "name": "SanDisk SSD PLUS 1TB Internal SSD, SATA III 6 Gb/s",
            "slug": "sandisk-ssd-plus-1tb-internal-ssd",
            "price": { "amount": 10900, "currency": "EUR" },
            "stock": 9,
            "category": { "name": "Electronics", "slug": "electronics" },
            "imageUrl": "/images/products/sandisk-ssd-plus-1tb-internal-ssd.svg"
          }
        }
      ]
    }
  }
}
```

### product

```graphql
{ product(slug: "mens-cotton-jacket") { id name price { amount currency } stock category { slug } } }
```

```json
{
  "data": {
    "product": {
      "id": "product-03",
      "name": "Mens Cotton Jacket",
      "price": { "amount": 5599, "currency": "EUR" },
      "stock": 8,
      "category": { "slug": "mens-clothing" }
    }
  }
}
```

### categories

```graphql
{ categories { id name slug } }
```

```json
{
  "data": {
    "categories": [
      { "id": "category-mens-clothing", "name": "Men's clothing", "slug": "mens-clothing" },
      { "id": "category-jewellery", "name": "Jewellery", "slug": "jewellery" },
      { "id": "category-electronics", "name": "Electronics", "slug": "electronics" },
      { "id": "category-womens-clothing", "name": "Women's clothing", "slug": "womens-clothing" }
    ]
  }
}
```

### cart, before anything is in it

```graphql
{ cart { id lines { id } subtotal { amount } shipping { amount } total { amount } } }
```

```json
{
  "data": {
    "cart": {
      "id": "cart-622ced3e",
      "lines": [],
      "subtotal": { "amount": 0 },
      "shipping": { "amount": 0 },
      "total": { "amount": 0 }
    }
  }
}
```

A cart with nothing in it is charged nothing at all.

### addToCart

```graphql
mutation AddToCart($productId: ID!, $quantity: Int) {
  addToCart(productId: $productId, quantity: $quantity) {
    cart {
      id
      lines { id quantity product { id name price { amount } } lineTotal { amount currency } }
      promotion { code kind discount { amount } }
      subtotal { amount }
      shipping { amount }
      total { amount }
      updatedAt
    }
    availableStock
    errors { code message field }
  }
}
```

```json
{ "productId": "product-18", "quantity": 2 }
```

The answer carries the anonymous cart cookie, httpOnly, SameSite Lax, on the
whole site, for thirty days.

```json
{
  "data": {
    "addToCart": {
      "cart": {
        "id": "cart-8000c773",
        "lines": [
          {
            "id": "line-4deafe31",
            "quantity": 2,
            "product": { "id": "product-18", "name": "MBJ Women's Solid Short Sleeve Boat Neck V", "price": { "amount": 985 } },
            "lineTotal": { "amount": 1970, "currency": "EUR" }
          }
        ],
        "promotion": null,
        "subtotal": { "amount": 1970 },
        "shipping": { "amount": 495 },
        "total": { "amount": 2465 },
        "updatedAt": "2026-09-09T00:39:06Z"
      },
      "availableStock": null,
      "errors": []
    }
  }
}
```

One answer, four subgraphs: `cart` gave the lines and the subtotal, `catalogue`
gave the product name and price, `promotions` gave the shipping and the total,
and the gateway put them together.

### changeCartLineQuantity

```graphql
mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {
  changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {
    cart { id lines { id quantity lineTotal { amount } } subtotal { amount } shipping { amount } total { amount } }
    availableStock
    errors { code message field }
  }
}
```

```json
{ "lineId": "line-4deafe31", "quantity": 3 }
```

```json
{
  "data": {
    "changeCartLineQuantity": {
      "cart": {
        "id": "cart-8000c773",
        "lines": [{ "id": "line-4deafe31", "quantity": 3, "lineTotal": { "amount": 2955 } }],
        "subtotal": { "amount": 2955 },
        "shipping": { "amount": 495 },
        "total": { "amount": 3450 }
      },
      "availableStock": null,
      "errors": []
    }
  }
}
```

### addToCart above the stock

`product-12` has one item left in the seed, so a second one is refused and the
answer says how many are available.

```json
{ "productId": "product-12", "quantity": 2 }
```

```json
{
  "data": {
    "addToCart": {
      "cart": { "id": "cart-8000c773", "subtotal": { "amount": 2955 } },
      "availableStock": 1,
      "errors": [
        {
          "code": "OUT_OF_STOCK",
          "message": "WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive has 1 in stock.",
          "field": "quantity"
        }
      ]
    }
  }
}
```

### applyPromotionCode

```graphql
mutation ApplyPromotionCode($code: String!) {
  applyPromotionCode(code: $code) {
    cart { id promotion { code kind discount { amount } } subtotal { amount } shipping { amount } total { amount } }
    availableStock
    errors { code message field }
  }
}
```

```json
{ "code": "freeship" }
```

```json
{
  "data": {
    "applyPromotionCode": {
      "cart": {
        "id": "cart-8000c773",
        "promotion": { "code": "FREESHIP", "kind": "FREE_SHIPPING", "discount": { "amount": 0 } },
        "subtotal": { "amount": 2955 },
        "shipping": { "amount": 0 },
        "total": { "amount": 2955 }
      },
      "availableStock": null,
      "errors": []
    }
  }
}
```

A free shipping code has a discount of zero and shows in the shipping instead,
so `total = subtotal + shipping - discount` needs no exception.

### applyPromotionCode outside its window

```json
{ "code": "SUMMER2025" }
```

```json
{
  "data": {
    "applyPromotionCode": {
      "cart": { "promotion": { "code": "FREESHIP", "kind": "FREE_SHIPPING", "discount": { "amount": 0 } } },
      "availableStock": null,
      "errors": [
        { "code": "CODE_EXPIRED", "message": "SUMMER2025 falls outside its validity window today.", "field": "code" }
      ]
    }
  }
}
```

The cart keeps the code it had. `NOSUCHCODE` answers `CODE_UNKNOWN`, `ONCE`
answers `CODE_EXHAUSTED`, and `FIVEOFF` on a cart below 2500 answers
`CODE_MINIMUM_NOT_MET`.

### removePromotionCode

```graphql
mutation { removePromotionCode { cart { promotion { code } shipping { amount } total { amount } } errors { code } } }
```

```json
{
  "data": {
    "removePromotionCode": {
      "cart": { "promotion": null, "shipping": { "amount": 495 }, "total": { "amount": 3450 } },
      "errors": []
    }
  }
}
```

### removeCartLine

```graphql
mutation RemoveCartLine($lineId: ID!) {
  removeCartLine(lineId: $lineId) { cart { lines { id } subtotal { amount } total { amount } } errors { code } }
}
```

```json
{ "lineId": "line-4deafe31" }
```

```json
{
  "data": {
    "removeCartLine": {
      "cart": { "lines": [], "subtotal": { "amount": 0 }, "total": { "amount": 0 } },
      "errors": []
    }
  }
}
```

Removing the same line again answers `CART_LINE_NOT_FOUND`, so two tabs cannot
remove one line twice.

### a mutation without an Origin header

```
POST http://localhost:4100/graphql
content-type: application/json
```

```graphql
mutation AddToCart($productId: ID!) { addToCart(productId: $productId) { cart { id } errors { code } } }
```

```
403
```

```json
{
  "errors": [
    {
      "message": "A mutation needs an Origin header this store allows.",
      "extensions": { "code": "ORIGIN_NOT_ALLOWED" }
    }
  ]
}
```

There is no `data` at all: the check runs before any resolver.

### register

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    customer { id email name createdAt }
    accessToken
    accessTokenExpiresAt
    errors { code message field }
  }
}
```

```json
{ "input": { "email": "sam@example.com", "name": "Sam Visser", "password": "correct horse battery" } }
```

The answer carries the refresh cookie, httpOnly, SameSite Lax, on the path of
the refresh mutation only, for thirty days.

```json
{
  "data": {
    "register": {
      "customer": {
        "id": "customer-df5ac955",
        "email": "sam@example.com",
        "name": "Sam Visser",
        "createdAt": "2026-09-09T00:39:07Z"
      },
      "accessToken": "a signed RS256 token, shortened",
      "accessTokenExpiresAt": "2026-09-09T00:54:07Z",
      "errors": []
    }
  }
}
```

The address is normalised to lower case. A second registration of
`jane@example.com` answers `EMAIL_TAKEN` on `input.email`, a password below
twelve characters answers `PASSWORD_TOO_SHORT`, and an address without a domain
answers `EMAIL_INVALID`.

### addToWishlist while nobody is signed in

```graphql
mutation AddToWishlist($productId: ID!) {
  addToWishlist(productId: $productId) { products { id name } errors { code message } }
}
```

```json
{ "productId": "product-05" }
```

```json
{
  "data": {
    "addToWishlist": {
      "products": [
        { "id": "product-05", "name": "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet" }
      ],
      "errors": []
    }
  }
}
```

The anonymous wishlist is kept on the server against the `zappy_cart` cookie,
exactly like the anonymous cart, so this never answers `NOT_AUTHENTICATED`.

### login

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    customer { id email name sessions { id device createdAt lastUsedAt current } wishlist { id name } }
    accessToken
    accessTokenExpiresAt
    errors { code message }
  }
}
```

```json
{ "input": { "email": "jane@example.com", "password": "correct horse battery staple", "device": "Chrome on Windows" } }
```

```json
{
  "data": {
    "login": {
      "customer": {
        "id": "customer-01",
        "email": "jane@example.com",
        "name": "Jane Doe",
        "sessions": [
          {
            "id": "session-7535ca3c",
            "device": "Chrome on Windows",
            "createdAt": "2026-09-09T00:39:07Z",
            "lastUsedAt": "2026-09-09T00:39:07Z",
            "current": true
          }
        ],
        "wishlist": [
          { "id": "product-05", "name": "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet" }
        ]
      },
      "accessToken": "a signed RS256 token, shortened",
      "accessTokenExpiresAt": "2026-09-09T00:54:07Z",
      "errors": []
    }
  }
}
```

The anonymous cart and the anonymous wishlist merged into the account of Jane.
The merge only ever adds, so nothing she had is lost. A wrong password answers
one code, `CREDENTIALS_INVALID`, and so does an address nobody registered.

### me and wishlist, with the access token in the Authorization header

```graphql
{ me { id email name createdAt sessions { id device current } wishlist { id name } } }
```

```json
{
  "data": {
    "me": {
      "id": "customer-01",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-01-15T09:00:00Z",
      "sessions": [{ "id": "session-7535ca3c", "device": "Chrome on Windows", "current": true }],
      "wishlist": [
        { "id": "product-05", "name": "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet" }
      ]
    }
  }
}
```

```graphql
{ wishlist { id name price { amount } } }
```

```json
{
  "data": {
    "wishlist": [
      {
        "id": "product-05",
        "name": "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet",
        "price": { "amount": 69500 }
      }
    ]
  }
}
```

`accounts` answered the product id alone and the gateway asked `catalogue` for
the rest. That is the entity reference doing its work.

### removeFromWishlist

```graphql
mutation RemoveFromWishlist($productId: ID!) {
  removeFromWishlist(productId: $productId) { products { id name } errors { code } }
}
```

```json
{ "productId": "product-05" }
```

```json
{ "data": { "removeFromWishlist": { "products": [], "errors": [] } } }
```

### refreshSession, with the refresh cookie

```graphql
mutation { refreshSession { accessToken accessTokenExpiresAt errors { code message } } }
```

```json
{
  "data": {
    "refreshSession": {
      "accessToken": "a new signed RS256 token, shortened",
      "accessTokenExpiresAt": "2026-09-09T00:54:08Z",
      "errors": []
    }
  }
}
```

The answer carries a new refresh cookie. Sending the old one again answers:

```json
{
  "data": {
    "refreshSession": {
      "accessToken": null,
      "accessTokenExpiresAt": null,
      "errors": [{ "code": "SESSION_INVALID", "message": "That session is unknown, expired, or was already used." }]
    }
  }
}
```

and the whole session family is revoked, so the new token stops working as well.

### placeOrder

```graphql
mutation PlaceOrder($idempotencyKey: String) {
  placeOrder(idempotencyKey: $idempotencyKey) {
    order {
      id number status placedAt promotionCode
      lines { productName unitPrice { amount } quantity lineTotal { amount } }
      subtotal { amount } discount { amount } shipping { amount } total { amount }
    }
    errors { code message }
  }
}
```

```json
{ "idempotencyKey": "checkout-2026-09-09-jane-1" }
```

```json
{
  "data": {
    "placeOrder": {
      "order": {
        "id": "order-dc9a5c47",
        "number": "ZM-000001",
        "status": "PAID",
        "placedAt": "2026-09-09T00:39:08Z",
        "promotionCode": null,
        "lines": [
          {
            "productName": "MBJ Women's Solid Short Sleeve Boat Neck V",
            "unitPrice": { "amount": 985 },
            "quantity": 2,
            "lineTotal": { "amount": 1970 }
          }
        ],
        "subtotal": { "amount": 1970 },
        "discount": { "amount": 0 },
        "shipping": { "amount": 495 },
        "total": { "amount": 2465 }
      },
      "errors": []
    }
  }
}
```

Sending the same `idempotencyKey` again answers the same order and places
nothing:

```json
{
  "data": {
    "placeOrder": {
      "order": { "id": "order-dc9a5c47", "number": "ZM-000001", "total": { "amount": 2465 } },
      "errors": []
    }
  }
}
```

A new key on the now empty cart answers:

```json
{
  "data": {
    "placeOrder": {
      "order": null,
      "errors": [{ "code": "CART_EMPTY", "message": "The cart has no lines, so there is nothing to order." }]
    }
  }
}
```

and without an access token it answers `NOT_AUTHENTICATED`.

### orders and order

```graphql
{ orders(first: 5) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id number status total { amount } placedAt } } } }
```

```json
{
  "data": {
    "orders": {
      "totalCount": 1,
      "pageInfo": { "hasNextPage": false, "endCursor": "b3JkZXItZGM5YTVjNDc" },
      "edges": [
        {
          "cursor": "b3JkZXItZGM5YTVjNDc",
          "node": {
            "id": "order-dc9a5c47",
            "number": "ZM-000001",
            "status": "PAID",
            "total": { "amount": 2465 },
            "placedAt": "2026-09-09T00:39:08Z"
          }
        }
      ]
    }
  }
}
```

```graphql
query Order($id: ID!) {
  order(id: $id) {
    id number status
    lines { productName unitPrice { amount } quantity lineTotal { amount } }
    subtotal { amount } discount { amount } shipping { amount } total { amount } placedAt
  }
}
```

An order of another customer answers `null`, so the answer tells nobody which
ids exist.

### revokeSession and logout

```graphql
mutation RevokeSession($sessionId: ID!) {
  revokeSession(sessionId: $sessionId) { sessions { id device current } errors { code message } }
}
```

```json
{ "sessionId": "session-7535ca3c" }
```

```json
{ "data": { "revokeSession": { "sessions": [], "errors": [] } } }
```

The access token that was issued for that session stops working immediately,
because every subgraph checks the session id after it checks the signature:

```graphql
{ me { id email } }
```

```json
{ "data": { "me": null } }
```

```graphql
mutation { logout { success errors { code } } }
```

```json
{ "data": { "logout": { "success": true, "errors": [] } } }
```

The answer clears the refresh cookie. Logging out twice answers `true` again,
because the outcome the client wanted is the outcome it has.

## Apollo Router

The router of Apollo is a Rust binary and it is what Apollo runs in production:
one process, no Node.js, a query planner written for throughput, and a
configuration file instead of code. This project ships `router/router.yaml`, and
the same `router/supergraph.graphql` runs under it unchanged:

```
router --supergraph router/supergraph.graphql --config router/router.yaml
```

`router.yaml` carries exactly what the gateway process carries in code: the
listen address and the graph path, the health endpoint, CORS for the three
frontend origins with credentials allowed and `set-cookie` exposed, propagation
of `authorization`, `cookie` and `origin` to every subgraph, a timeout per
subgraph, and the depth, height, alias and root field limits.

This repository runs the JavaScript gateway (`@apollo/gateway` on Apollo Server
5 with Express 5) instead, for one reason: the development machine has an
antivirus that blocks unsigned downloaded executables, so neither the router
binary nor the Rover binary that fetches the composition plugin can run there.
Everything the router does for this store, the gateway does in
`router/src/host/main.ts`, and composition is `composeServices` from
`@apollo/composition` in `tools/compose.mjs`. A reader with a machine that runs
the binary swaps in the two commands above and changes nothing else.

What the router adds beyond this gateway, and why it is the production choice:
the query planner and the execution engine are compiled, so tail latency under
load is far better. Automatic persisted queries, response caching, rate limits,
coprocessors and Rhai scripts are configuration rather than code. OpenTelemetry
export is built in. Those belong to item Z11b.

## The PostgreSQL 18 profile

Every subgraph opens its database through one port,
`shared/src/persistence/database.ts`, with two adapters behind it: `node:sqlite`
by default and `pg` when a connection string is given. Set one environment
variable per subgraph and nothing else changes:

```
ZAPPY_CATALOGUE_DATABASE_URL=postgres://zappy:zappy@localhost:5432/zappy_catalogue
ZAPPY_CART_DATABASE_URL=postgres://zappy:zappy@localhost:5432/zappy_cart
ZAPPY_PROMOTIONS_DATABASE_URL=postgres://zappy:zappy@localhost:5432/zappy_promotions
ZAPPY_ORDERING_DATABASE_URL=postgres://zappy:zappy@localhost:5432/zappy_ordering
ZAPPY_ACCOUNTS_DATABASE_URL=postgres://zappy:zappy@localhost:5432/zappy_accounts
```

A subgraph owns its schema, so five databases, or five schemas in one, is the
shape. The statements are written with question mark placeholders and the
PostgreSQL adapter turns them into numbered ones, which is the only dialect
difference in the code. Decision 4 in `BACKLOG.md` says the tutorial runs
without Docker, so the SQLite path is the default and the PostgreSQL path is
verified once Docker is on the machine.

## Configuration

| Variable | Default | What it changes |
|---|---|---|
| `ZAPPY_PROFILE` | `development` | `production` drops `resetSeed` from the schema and stops the seed loading at start |
| `ZAPPY_<NAME>_PORT` | 4101 to 4105 | the port one subgraph listens on |
| `ZAPPY_<NAME>_URL` | `http://localhost:<port>/graphql` | where the other subgraphs and the gateway find it |
| `ZAPPY_<NAME>_SQLITE_FILE` | `backends/node/data/<name>.sqlite` | the SQLite file, `:memory:` for a database that lives as long as the process |
| `ZAPPY_<NAME>_DATABASE_URL` | none | a PostgreSQL connection string, which switches the adapter |
| `ZAPPY_JWKS_URL` | `http://localhost:4105/.well-known/jwks.json` | where the subgraphs fetch the signing keys |
| `ZAPPY_ALLOWED_ORIGINS` | the three frontend origins | the origins a mutation may come from |
| `ZAPPY_SUBGRAPH_TIMEOUT_MILLISECONDS` | 5000 | how long any call to a subgraph may take |

## What Z11b adds

Z11a is the graph, the contract and the security model. The delivery guarantees
are the next item, and this backend is plain about where it stands today.

`placeOrder` writes the order and its `OrderPlaced` outbox row in one
transaction, so the event can never be lost. The consumers, however, are called
request driven straight after the commit: the cart is emptied, the promotion is
cleared, the use of the code is counted and the confirmation mail is addressed,
all inside the same request. If the process dies between the commit and those
calls, the outbox row stays unpublished and nothing picks it up yet. The order
is correct and its stock is reserved, but a promotion use may go uncounted and a
cart may stay full.

Z11b turns that into the real thing, and `docs/federation.md` lists what it
brings: an outbox publisher that polls the table, at least once delivery with
idempotent consumers keyed by event id, a dead letter after the last retry, a
retry budget with exponential backoff and jitter, a circuit breaker per
downstream with the cart degrading to product stubs when `catalogue` is down,
cache invalidation driven by `ProductChanged`, one trace per request across the
gateway and every subgraph, and a test for each of those that proves it.

## The house rules this code follows

No abbreviations in identifiers or file names. No comments in code: the names
and this file carry the meaning. One concept, one word. British spelling. Every
business rule has exactly one home inside this backend, which is why the totals
live in `promotions` and `ordering` copies them.

The one place where a type assertion was unavoidable is
`shared/src/graphql/subgraphServer.ts`. GraphQL Code Generator types a reference
resolver with two arguments and `@apollo/subgraph` types every resolver with
four, so the generated map is asserted once at that boundary. The safety that
matters is kept, because each resolver map is declared as the generated
`Resolvers` type where it is written.

## Versions, verified on npm on 9 September 2026

| Package | Version | Note |
|---|---|---|
| Node.js | 24.20.0 | the machine this was built and run on, `node:sqlite` is built in |
| `@apollo/server` | 5.5.1 | already in `docs/versions.md` |
| `@apollo/subgraph` | 2.15.0 | engines node 24 or later, peer graphql 16.11 or later |
| `@apollo/gateway` | 2.14.4 | peer graphql 16.5 or later |
| `@apollo/composition` | 2.14.4 | `composeServices`, peer graphql 16.5 or later |
| `@apollo/federation-internals` | 2.14.4 | extracts the API schema from the supergraph |
| `@as-integrations/express5` | 1.1.2 | peers express 5, Apollo Server 4 or 5 |
| `express` | 5.2.1 | already in `docs/versions.md` |
| `cors` | 2.8.6 | with `@types/cors` 2.8.19 |
| `graphql` | 16.14.2 | the latest 16.x, which every Apollo package above declares as its peer |
| `dataloader` | 2.2.3 | one loader per request |
| `jose` | 6.2.12 | the JSON web key set and the RS256 signing |
| `argon2` | 0.45.1 | ships a prebuilt binding, no compiler needed |
| `pg` | 8.23.0 | with `@types/pg` 8.23.1, the PostgreSQL 18 profile |
| `@graphql-codegen/cli` | 7.4.0 | with `typescript` 6.1.0, `typescript-resolvers` 6.1.0 and `add` 7.1.0 |
| `typescript` | 6.0.3 | the 6.0 line the family pins, `docs/versions.md` |
| `@types/node` | 26.5.0 | |
| Apollo Router | 2.16.3 | the binary `router/router.yaml` is written for, not run here |
| PostgreSQL | 18 | the documented profile, `docs/versions.md` |
