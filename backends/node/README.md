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
tests 231
suites 45
pass 231
fail 0
```

`npm test` runs `node:test` over the compiled tests: the domain rules and the
resolvers of every subgraph against an in-memory store, the nine topics of the
role each with its own file, plus one integration run that starts all five
subgraphs and the gateway in one process and drives the whole store through
`http://localhost:4100/graphql`. The last four tests of that run stop the
catalogue subgraph and prove the cart still answers, so a passing run has been
through the chaos test as well.

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
  src/domain/productChanged.ts       the event a write announces
  src/application/ports.ts           ProductRepository, CategoryRepository, StockReservationStore, ProductChangeListener
  src/application/readCatalogue.ts   paging in the seed order
  src/application/reserveStock.ts    the reservation with its idempotency key
  src/application/resetSeed.ts       reloads the seed and fans out to the other four
  src/adapters/persistence/          the tables and the SQL repositories
  src/adapters/persistence/cachedProductRepository.ts  the read cache and its invalidation
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
  src/adapters/catalogue/entityCatalogueReader.ts    reads Product through the entity reference, batched
  src/adapters/catalogue/degradedCatalogueReader.ts  the last known prices when catalogue is down
  src/adapters/persistence/                          the tables and the SQL repository
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
   and nothing else happens. A second call that arrives while the first is still
   running waits for the same answer.
3. `ordering` reads the cart of the visitor from `cart`: the id, the lines and
   the subtotal.
4. `ordering` reads the product names and the prices of the moment from
   `catalogue` through `_entities`, one call for every line together.
5. `ordering` reads the promotion, the shipping and the total from `promotions`
   through `_entities`, with the subtotal inside the representation, which is
   exactly what the `@requires` above asks for.
6. `ordering` reserves the stock in `catalogue` with the same idempotency key.
   Either every line is reserved or none is, and a refusal names the product.
   That reservation is the first step of the saga.
7. In one database transaction the order, its lines and one outbox row are
   written together. If that transaction fails, the saga releases the
   reservation, so no stock is ever held without its order.
8. After the commit `placeOrder` nudges the outbox publisher, which reads the
   row it has just written and runs the consumers: the cart is emptied, its
   promotion is cleared, the use of the code is counted in `promotions`, and the
   confirmation mail is addressed by reading `Customer` from `accounts` through
   its entity reference. A consumer that fails leaves the row for the poller.

```
subgraphs/ordering/
  src/domain/order.ts                              the factory that places an order, and the equation
  src/domain/orderPlaced.ts                        the event
  src/application/placeOrder.ts                    the eight steps above
  src/application/idempotentPlaceOrder.ts          the replay and the shared promise of step 2
  src/application/stockReservationSaga.ts          the reservation of step 6 and its compensation
  src/application/outboxPublisher.ts               the delivery of step 8, with its retries
  src/adapters/graph/graphCartReader.ts            the three reads of steps 3, 4 and 5
  src/adapters/graph/graphStockReserver.ts         the reservation and its release
  src/adapters/graph/graphOrderPlacedConsumers.ts  the consumers the publisher calls
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
export is built in, where this gateway exports its spans to the in-memory
exporter of `shared/src/telemetry/requestTracing.ts` and a reader with a
collector swaps that one line.

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

## The nine topics of the role, one place and one test each

Z11a built the graph, the contract and the security model. Z11b puts the topics
of a backend role at a retailer into running code. Every one of them has a file
whose name says what it is, a test that proves the behaviour, and a trade-off
written next to it. The same table stands in `docs/federation.md`.

| Topic | The place | The proving test |
|---|---|---|
| Cache invalidation | `subgraphs/catalogue/src/adapters/persistence/cachedProductRepository.ts` | `subgraphs/catalogue/tests/cachedProductRepository.test.ts` |
| The stock reservation saga | `subgraphs/ordering/src/application/stockReservationSaga.ts` | `subgraphs/ordering/tests/stockReservationSaga.test.ts` |
| Request driven against event driven | `subgraphs/promotions/src/application/promotionInteractions.ts` | `subgraphs/promotions/tests/promotionInteractions.test.ts` |
| Idempotency keys | `subgraphs/ordering/src/application/idempotentPlaceOrder.ts` | `subgraphs/ordering/tests/idempotentPlaceOrder.test.ts` |
| Retries with backoff, jitter and a budget | `shared/src/http/retryPolicy.ts` | `shared/tests/retryPolicy.test.ts` |
| The outbox with at least once delivery | `subgraphs/ordering/src/application/outboxPublisher.ts` | `subgraphs/ordering/tests/outboxPublisher.test.ts` |
| The circuit breaker and the degraded cart | `subgraphs/cart/src/adapters/catalogue/degradedCatalogueReader.ts` | `router/tests/graph.test.ts`, "the graph when the catalogue subgraph is stopped" |
| DataLoader and query plans | `router/src/queryPlanPlugin.ts` | `router/tests/graph.test.ts`, "reads the query plan and shows one batched catalogue fetch for three cart lines" |
| One trace per request | `shared/src/telemetry/requestTracing.ts` | `router/tests/graph.test.ts`, "puts the gateway and every subgraph it called on one trace" |

### Cache invalidation

The catalogue is twenty rows that almost never change and that every page reads,
so `catalogue` keeps them in memory and the database sees one read. The cache is a
decorator around the `ProductRepository` port, the same shape `docs/patterns.md`
names for the C# backend, and the application layer above it cannot tell the
difference. Invalidation is the harder half. A write announces `ProductChanged`
and the cache drops what it holds rather than trying to update it, because a
cache that is quietly wrong is worse than a read that is slow. The reservation
path is deliberately not cached: `reserveStock` reads and writes the stored
repository inside its transaction and announces the change afterwards, so the
stock a reservation decides on is the stock the database holds.

`subgraphs/catalogue/src/domain/productChanged.ts`

```ts
export const productChangedEventName = "ProductChanged";

export const wholeCatalogue = "the whole catalogue";

export type ProductChanged = {
  readonly name: typeof productChangedEventName;
  readonly productId: string | typeof wholeCatalogue;
  readonly changedAt: string;
};

export function productChanged(productId: string, changedAt: string): ProductChanged {
  return { name: productChangedEventName, productId, changedAt };
}

export function wholeCatalogueChanged(changedAt: string): ProductChanged {
  return { name: productChangedEventName, productId: wholeCatalogue, changedAt };
}
```

`subgraphs/catalogue/src/adapters/persistence/cachedProductRepository.ts`

```ts
import type { Category, Product } from "../../domain/product.js";
import {
  productChanged,
  wholeCatalogueChanged,
  type ProductChanged
} from "../../domain/productChanged.js";
import type { ProductChangeListener, ProductRepository } from "../../application/ports.js";

export type CatalogueCacheCounters = {
  readonly databaseReads: number;
  readonly cacheHits: number;
  readonly invalidations: number;
};

export type CachedCatalogue = {
  readonly repository: ProductRepository;
  readonly listener: ProductChangeListener;
  counters(): CatalogueCacheCounters;
};

export function cachedProductRepository(
  stored: ProductRepository,
  now: () => Date,
  otherListeners: readonly ProductChangeListener[] = []
): CachedCatalogue {
  let cachedCatalogue: readonly Product[] | null = null;
  let databaseReads = 0;
  let cacheHits = 0;
  let invalidations = 0;

  const listener: ProductChangeListener = {
    productChanged(event: ProductChanged): void {
      cachedCatalogue = null;
      invalidations = invalidations + 1;
      for (const other of otherListeners) {
        other.productChanged(event);
      }
    }
  };

  async function catalogueInOrder(): Promise<readonly Product[]> {
    if (cachedCatalogue !== null) {
      cacheHits = cacheHits + 1;
      return cachedCatalogue;
    }
    databaseReads = databaseReads + 1;
    cachedCatalogue = await stored.readAllInCatalogueOrder();
    return cachedCatalogue;
  }

  const repository: ProductRepository = {
    async readAllInCatalogueOrder(): Promise<readonly Product[]> {
      return catalogueInOrder();
    },

    async readBySlug(slug: string): Promise<Product | null> {
      return (await catalogueInOrder()).find((product) => product.slug === slug) ?? null;
    },

    async readManyByIdentifier(identifiers: readonly string[]): Promise<readonly Product[]> {
      const wanted = new Set(identifiers);
      return (await catalogueInOrder()).filter((product) => wanted.has(product.id));
    },

    async writeStock(productId: string, stock: number): Promise<void> {
      await stored.writeStock(productId, stock);
      listener.productChanged(productChanged(productId, now().toISOString()));
    },

    async replaceCatalogue(products: readonly Product[], categories: readonly Category[]): Promise<void> {
      await stored.replaceCatalogue(products, categories);
      listener.productChanged(wholeCatalogueChanged(now().toISOString()));
    }
  };

  return {
    repository,
    listener,
    counters(): CatalogueCacheCounters {
      return { databaseReads, cacheHits, invalidations };
    }
  };
}
```

The host wires the two paths apart. The read side runs on the cache and the
reservation runs on the stored repository with the cache as its listener:

```ts
const storedProducts = sqlProductRepository(database);
const cachedProducts = cachedProductRepository(storedProducts, () => systemClock.now());
const catalogue = readCatalogue(cachedProducts.repository, categories);
const stock = reserveStock(
  database,
  storedProducts,
  reservations,
  () => systemClock.now(),
  cachedProducts.listener
);
```

`subgraphs/catalogue/tests/cachedProductRepository.test.ts` proves it. Three
different reads cost one database read and two cache hits. A stock write reaches
the cache: the listener hears `ProductChanged` for `product-03`, the next read
answers three where it answered eight, and the database read count went from one
to two. A reservation through the other path does the same, and its release puts
the stock back.

The trade-off: how long a stale price is acceptable against how much invalidation logic a team
can carry. One process is easy. Five catalogue instances behind a load balancer
each hold their own copy, so the announcement has to leave the process, which is
what a message bus or a shared cache is for. This backend stops at the process
boundary and says so here rather than pretending otherwise.

### The stock reservation saga

Placing an order is two writes in two services. `catalogue` reserves the stock
and `ordering` writes the order with its outbox row. There is no transaction
across the two, so the shape is a saga: reserve, do the work, and release the
reservation when the work fails. The file says exactly that and nothing else, so
`placeOrder` reads as the eight steps and not as a set of nested try blocks.

`subgraphs/ordering/src/application/stockReservationSaga.ts`

```ts
import type { StockReserver } from "./ports.js";

export type ReservedLine = {
  readonly productId: string;
  readonly quantity: number;
};

export type SagaOutcome<Value> =
  | { readonly kind: "completed"; readonly value: Value }
  | {
      readonly kind: "unavailable";
      readonly productId: string | null;
      readonly availableStock: number | null;
    };

export type StockReservationSaga = {
  withReservedStock<Value>(
    idempotencyKey: string,
    lines: readonly ReservedLine[],
    work: () => Promise<Value>
  ): Promise<SagaOutcome<Value>>;
};

export function stockReservationSaga(stock: StockReserver): StockReservationSaga {
  async function compensate(idempotencyKey: string): Promise<void> {
    try {
      await stock.release(idempotencyKey);
    } catch {
      return;
    }
  }

  return {
    async withReservedStock<Value>(
      idempotencyKey: string,
      lines: readonly ReservedLine[],
      work: () => Promise<Value>
    ): Promise<SagaOutcome<Value>> {
      const reservation = await stock.reserve(idempotencyKey, lines);
      if (!reservation.reserved) {
        return {
          kind: "unavailable",
          productId: reservation.unavailableProductId,
          availableStock: reservation.availableStock
        };
      }
      try {
        return { kind: "completed", value: await work() };
      } catch (failure) {
        await compensate(idempotencyKey);
        throw failure;
      }
    }
  };
}
```

`subgraphs/ordering/tests/stockReservationSaga.test.ts` proves that the
reservation runs before the step that follows, that the second step never runs
when the stock is short and the answer names the product, that a failure in the
second step releases under the same key it reserved with, and that a
compensation which fails itself does not hide the failure that caused it.
`subgraphs/ordering/tests/orderingResolvers.test.ts` proves the same through the
resolver, with an order repository that refuses to write.

The trade-off: a saga of two steps against a distributed transaction. The compensation is only
as good as the process that runs it. If `ordering` dies between the reservation
and the release, the stock stays held until somebody puts it back. A production
system writes the release to its own outbox. This one leaves the reservation in
place, and because the release is keyed by the same idempotency key, a later
attempt is safe to make.

### Request driven against event driven

`promotions` does one capability both ways, in one file, so the choice is
visible rather than scattered. Validating a code is a request: the visitor is
waiting, the answer is the verdict, and nothing is written that a second call
could double. Counting a use is an event: nobody is waiting, the outbox may
deliver the same event twice, so the counter is keyed by the event id and a
repeat changes nothing. The resolvers call this one object for both, so it is
the real seam and not a second path beside the real one.

`subgraphs/promotions/src/application/promotionInteractions.ts`

```ts
import type { HandledEventStore, Money } from "@zappy/shared";
import type { ManagePromotions, PromotionOutcome } from "./applyPromotionCode.js";

export const promotionUseConsumerName = "promotions.countPromotionUse";

export type PromotionInteractions = {
  validateOnRequest(cartId: string, subtotal: Money, typedCode: string): Promise<PromotionOutcome>;
  countUseOnEvent(eventId: string, typedCode: string): Promise<boolean>;
};

export function promotionInteractions(
  promotions: ManagePromotions,
  handledEvents: HandledEventStore
): PromotionInteractions {
  return {
    async validateOnRequest(cartId, subtotal, typedCode): Promise<PromotionOutcome> {
      return promotions.apply(cartId, subtotal, typedCode);
    },

    async countUseOnEvent(eventId, typedCode): Promise<boolean> {
      let outcome = true;
      await handledEvents.onlyOnce(eventId, promotionUseConsumerName, async () => {
        outcome = await promotions.countUse(typedCode);
      });
      return outcome;
    }
  };
}
```

`subgraphs/promotions/tests/promotionInteractions.test.ts` proves that the
request answers `applied` or the refusal code in the same call and counts no
use, that the same event id three times raises the counter once, that two event
ids raise it twice, and that a repeat answers true because the outcome the
publisher wanted is the outcome it has.

The trade-off: latency and coupling against eventual consistency, decided per interaction
rather than per service. The visitor may not wait for the counter, and the
counter may not be wrong. Those two wishes point at different styles, and the
same subgraph can hold both.

### Idempotency keys

`placeOrder(idempotencyKey: String)` is in the contract, so a client that
retries a checkout after a timeout is answered rather than charged twice. Two
things can happen. The two calls overlap, which is the double click, or the
second arrives long after the first finished. The decorator answers both: an in
flight map keyed by the customer and the key hands the second caller the same
promise, and the stored order answers the later call. The unique index on
`(customer_id, idempotency_key)` is the line behind both.

`subgraphs/ordering/src/application/idempotentPlaceOrder.ts`

```ts
import type { PlaceOrder, PlaceOrderOutcome } from "./placeOrder.js";
import type { OrderRepository } from "./ports.js";

export type InFlightCheckouts = Map<string, Promise<PlaceOrderOutcome>>;

export function inFlightCheckouts(): InFlightCheckouts {
  return new Map<string, Promise<PlaceOrderOutcome>>();
}

export function idempotentPlaceOrder(
  inner: PlaceOrder,
  orders: OrderRepository,
  inFlight: InFlightCheckouts
): PlaceOrder {
  return {
    async place(customerId, idempotencyKey): Promise<PlaceOrderOutcome> {
      if (customerId === null || idempotencyKey === null) {
        return inner.place(customerId, idempotencyKey);
      }

      const alreadyPlaced = await orders.readByIdempotencyKey(idempotencyKey, customerId);
      if (alreadyPlaced !== null) {
        return { kind: "placed", order: alreadyPlaced };
      }

      const checkout = `${customerId}:${idempotencyKey}`;
      const running = inFlight.get(checkout);
      if (running !== undefined) {
        return running;
      }

      const started = inner.place(customerId, idempotencyKey).finally(() => {
        inFlight.delete(checkout);
      });
      inFlight.set(checkout, started);
      return started;
    }
  };
}
```

`subgraphs/ordering/tests/idempotentPlaceOrder.test.ts` proves it. Two calls
started at the same moment with the same key answer the same order, the checkout
underneath ran once and the customer has one order. A later call with that key
replays the stored order. Two different keys place two orders, a call without a
key is handed straight through, two customers may use the same words for their
own keys, and a key whose checkout failed is free to try again.

The trade-off: where the keys live and how long they are kept. Here the key lives on the order
row for as long as the order does, which is the simplest correct answer for a
store this size. A busy checkout keeps them in a table of their own with a
lifetime, because the index that has to stay unique grows for ever otherwise.

### Retries with backoff, jitter and a budget

A retry is for a call that can be repeated safely, so `askSubgraph` retries only
when the caller passes `idempotent: true`. Every read the subgraphs make of each
other is marked that way, and so are the outbox consumers, because they are
idempotent by their event id. A retry is also only for a failure a retry can
fix, so a connection failure or a 5xx is retryable and a GraphQL error answer is
final. The delay doubles and carries jitter, so a thousand clients that failed
at the same moment do not come back at the same moment. The budget is the part
that is usually left out: a sliding window that allows the minimum plus a ratio
of the calls it has seen, so when everything fails the retries stop instead of
tripling the load on a service that is already down.

`shared/src/http/retryPolicy.ts`

```ts
export type BackoffSettings = {
  readonly firstDelayInMilliseconds: number;
  readonly growthFactor: number;
  readonly maximumDelayInMilliseconds: number;
  readonly jitterFraction: number;
};

export const defaultBackoffSettings: BackoffSettings = {
  firstDelayInMilliseconds: 50,
  growthFactor: 2,
  maximumDelayInMilliseconds: 2000,
  jitterFraction: 0.5
};

export function backoffCeilingInMilliseconds(attemptNumber: number, settings: BackoffSettings): number {
  const grown =
    settings.firstDelayInMilliseconds * Math.pow(settings.growthFactor, Math.max(attemptNumber - 1, 0));
  return Math.min(grown, settings.maximumDelayInMilliseconds);
}

export function backoffDelayInMilliseconds(
  attemptNumber: number,
  settings: BackoffSettings,
  randomFraction: number
): number {
  const ceiling = backoffCeilingInMilliseconds(attemptNumber, settings);
  return Math.round(ceiling * (1 - settings.jitterFraction * randomFraction));
}

export type RetryBudgetSettings = {
  readonly retryRatio: number;
  readonly minimumRetriesPerWindow: number;
  readonly windowInMilliseconds: number;
};

export const defaultRetryBudgetSettings: RetryBudgetSettings = {
  retryRatio: 0.2,
  minimumRetriesPerWindow: 5,
  windowInMilliseconds: 10_000
};

export type RetryBudget = {
  recordCall(): void;
  tryToSpendRetry(): boolean;
  callsInWindow(): number;
  retriesInWindow(): number;
};

export function retryBudget(
  settings: RetryBudgetSettings = defaultRetryBudgetSettings,
  now: () => number = Date.now
): RetryBudget {
  const callMoments: number[] = [];
  const retryMoments: number[] = [];

  function forgetOlderThanWindow(moments: number[], edge: number): void {
    while (moments.length > 0 && (moments[0] as number) <= edge) {
      moments.shift();
    }
  }

  function refresh(): void {
    const edge = now() - settings.windowInMilliseconds;
    forgetOlderThanWindow(callMoments, edge);
    forgetOlderThanWindow(retryMoments, edge);
  }

  return {
    recordCall(): void {
      refresh();
      callMoments.push(now());
    },

    tryToSpendRetry(): boolean {
      refresh();
      const allowance = settings.minimumRetriesPerWindow + settings.retryRatio * callMoments.length;
      if (retryMoments.length >= allowance) {
        return false;
      }
      retryMoments.push(now());
      return true;
    },

    callsInWindow(): number {
      refresh();
      return callMoments.length;
    },

    retriesInWindow(): number {
      refresh();
      return retryMoments.length;
    }
  };
}

export type RetryPlan = {
  readonly maximumAttempts: number;
  readonly backoff: BackoffSettings;
  readonly budget: RetryBudget;
  readonly sleep: (milliseconds: number) => Promise<void>;
  readonly randomFraction: () => number;
};

export function sleepFor(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function retryPlan(budget: RetryBudget, maximumAttempts = 3): RetryPlan {
  return {
    maximumAttempts,
    backoff: defaultBackoffSettings,
    budget,
    sleep: sleepFor,
    randomFraction: Math.random
  };
}

export async function withRetries<Value>(
  plan: RetryPlan,
  isRetryable: (failure: unknown) => boolean,
  attempt: (attemptNumber: number) => Promise<Value>
): Promise<Value> {
  plan.budget.recordCall();
  let attemptNumber = 1;
  for (;;) {
    try {
      return await attempt(attemptNumber);
    } catch (failure) {
      const anotherAttemptIsAllowed =
        attemptNumber < plan.maximumAttempts && isRetryable(failure) && plan.budget.tryToSpendRetry();
      if (!anotherAttemptIsAllowed) {
        throw failure;
      }
      await plan.sleep(backoffDelayInMilliseconds(attemptNumber, plan.backoff, plan.randomFraction()));
      attemptNumber = attemptNumber + 1;
    }
  }
}
```

`shared/tests/retryPolicy.test.ts` proves the backoff doubles and stops at the
ceiling, that every jittered delay stays inside the band the ceiling allows,
that the allowance grows with the calls in the window and is forgotten when the
window passes, and that a failure the caller calls final is not retried at all.
The test that carries the topic is the storm: a hundred calls that fail four
times each would be four hundred attempts, and with a budget of five plus a
fifth of the calls it is at most a hundred and twenty five.

The trade-off: when a retry makes an outage worse. A downstream that is slow because it is
overloaded gets three times the traffic from a client that retries without a
budget, which is how one struggling service becomes an outage. The budget is
what turns a retry from a hope into a bounded one.

### The outbox with at least once delivery

The order and its `OrderPlaced` row are written in one transaction, so the event
cannot be lost between the commit and the publish. The publisher reads the rows
that are due, runs the consumers in order, and marks the row published when they
have all answered. A consumer that fails raises the attempt count and sets the
moment of the next attempt from the same backoff, and the row is dead lettered
once the attempt budget is spent, so a poison message stops rather than running
for ever. `placeOrder` nudges the publisher straight after the commit, which is
why the visitor sees an empty cart in the same request, and the poller every two
seconds is what makes it a guarantee rather than a hope.

Emptying a cart and clearing its promotion are idempotent by their nature, so
they carry no guard. Counting the use of a promotion code is not, so that one
consumer is keyed by the event id through the shared handled event store.

`subgraphs/ordering/src/application/outboxPublisher.ts`

```ts
import { backoffDelayInMilliseconds, defaultBackoffSettings, type BackoffSettings } from "@zappy/shared";
import type { OrderPlaced } from "../domain/orderPlaced.js";
import type { OrderPlacedConsumers, OutboxRow, OutboxStore } from "./ports.js";

export type OutboxPass = {
  readonly published: number;
  readonly retried: number;
  readonly deadLettered: number;
};

export type OutboxNudge = {
  publishDue(): Promise<OutboxPass>;
};

export type OutboxPublisher = OutboxNudge & {
  startPolling(): void;
  stopPolling(): void;
};

export type OutboxPublisherSettings = {
  readonly attemptBudget: number;
  readonly pollingIntervalInMilliseconds: number;
  readonly backoff: BackoffSettings;
};

export const defaultOutboxPublisherSettings: OutboxPublisherSettings = {
  attemptBudget: 5,
  pollingIntervalInMilliseconds: 2000,
  backoff: defaultBackoffSettings
};

export function outboxPublisher(
  outbox: OutboxStore,
  consumers: OrderPlacedConsumers,
  now: () => Date,
  settings: OutboxPublisherSettings = defaultOutboxPublisherSettings,
  randomFraction: () => number = Math.random
): OutboxPublisher {
  let polling: ReturnType<typeof setInterval> | null = null;

  async function deliver(event: OrderPlaced, eventId: string): Promise<void> {
    await consumers.emptyCart(event.cartId);
    await consumers.clearCartPromotion(event.cartId);
    if (event.promotionCode !== null) {
      await consumers.countPromotionUse(event.promotionCode, event.orderId, eventId);
    }
    await consumers.sendConfirmation(event);
  }

  async function giveUpOrWaitLonger(row: OutboxRow, failure: unknown): Promise<"deadLettered" | "retried"> {
    const attempts = row.attempts + 1;
    const reason = failure instanceof Error ? failure.message : String(failure);
    if (attempts >= settings.attemptBudget) {
      await outbox.markDeadLettered(row.id, attempts, now().toISOString(), reason);
      return "deadLettered";
    }
    const waitInMilliseconds = backoffDelayInMilliseconds(attempts, settings.backoff, randomFraction());
    await outbox.recordFailure(
      row.id,
      attempts,
      new Date(now().getTime() + waitInMilliseconds).toISOString(),
      reason
    );
    return "retried";
  }

  async function publishDue(): Promise<OutboxPass> {
    let published = 0;
    let retried = 0;
    let deadLettered = 0;
    for (const row of await outbox.readDue(now().toISOString())) {
      try {
        await deliver(row.event, row.id);
        await outbox.markPublished(row.id, now().toISOString());
        published = published + 1;
      } catch (failure) {
        const verdict = await giveUpOrWaitLonger(row, failure);
        if (verdict === "deadLettered") {
          deadLettered = deadLettered + 1;
        } else {
          retried = retried + 1;
        }
      }
    }
    return { published, retried, deadLettered };
  }

  return {
    publishDue,

    startPolling(): void {
      if (polling !== null) {
        return;
      }
      polling = setInterval(() => {
        void publishDue().catch(() => undefined);
      }, settings.pollingIntervalInMilliseconds);
      polling.unref();
    },

    stopPolling(): void {
      if (polling === null) {
        return;
      }
      clearInterval(polling);
      polling = null;
    }
  };
}
```

`shared/src/messaging/handledEventStore.ts`

```ts
import type { Database } from "../persistence/database.js";

export type HandledEventStore = {
  onlyOnce(eventId: string, consumer: string, work: () => Promise<void>): Promise<boolean>;
  hasHandled(eventId: string, consumer: string): Promise<boolean>;
  forgetEverything(): Promise<void>;
};

export async function createHandledEventTable(database: Database): Promise<void> {
  await database.execute(`
    create table if not exists handled_event (
      event_id text not null,
      consumer text not null,
      handled_at text not null,
      primary key (event_id, consumer)
    )
  `);
}

export function sqlHandledEventStore(database: Database, now: () => Date): HandledEventStore {
  async function hasHandled(eventId: string, consumer: string): Promise<boolean> {
    const row = await database.queryOne<{ event_id: string }>(
      "select event_id from handled_event where event_id = ? and consumer = ?",
      [eventId, consumer]
    );
    return row !== null;
  }

  return {
    hasHandled,

    async onlyOnce(eventId: string, consumer: string, work: () => Promise<void>): Promise<boolean> {
      if (await hasHandled(eventId, consumer)) {
        return false;
      }
      await work();
      await database.execute(
        "insert into handled_event (event_id, consumer, handled_at) values (?, ?, ?)",
        [eventId, consumer, now().toISOString()]
      );
      return true;
    },

    async forgetEverything(): Promise<void> {
      await database.execute("delete from handled_event", []);
    }
  };
}
```

`subgraphs/ordering/tests/outboxPublisher.test.ts` proves the crash first: an
order is placed with a publisher that does nothing, so the row is left
unpublished the way a process that died would leave it, and the real publisher
picks it up and delivers it. Then the retry, with the attempt count and the
failure text on the row. Then the backoff, where the row is not due again until
the moment the publisher wrote. Then the dead letter after the third attempt,
and no further attempt after that. And then at least once with an idempotent
consumer: two deliveries of one event count one use.

The trade-off: at most once against at least once, and why exactly once is a property of the
consumer rather than of the transport. Two nudges at the same moment can read
the same row and deliver it twice, which is precisely why the counter is keyed
by the event id. A row that is dead lettered needs a person, and this backend
gives that person `readDeadLettered` and the failure text rather than pretending
the case does not arise.

### The circuit breaker and the degraded cart

When `catalogue` stops answering, the cart page has a choice: fail, or show the
lines with the prices it last saw. It shows them. The breaker in `shared` counts
the failures, opens after three, and stops the calls entirely for five seconds,
so a downstream that is down is not hammered by every visitor. The reader in
`cart` remembers every product it was told about and answers from that memory
when the live call fails or the circuit is open. A product it has never seen is
answered as nothing rather than as a wrong price.

`shared/src/http/circuitBreaker.ts`

```ts
export type CircuitState = "closed" | "open" | "halfOpen";

export type CircuitBreakerSettings = {
  readonly failuresBeforeOpening: number;
  readonly openDurationInMilliseconds: number;
  readonly successesBeforeClosing: number;
};

export const defaultCircuitBreakerSettings: CircuitBreakerSettings = {
  failuresBeforeOpening: 3,
  openDurationInMilliseconds: 5000,
  successesBeforeClosing: 1
};

export class CircuitOpenError extends Error {
  readonly downstream: string;

  constructor(downstream: string) {
    super(`The circuit to ${downstream} is open, so the call was not attempted.`);
    this.name = "CircuitOpenError";
    this.downstream = downstream;
  }
}

export type CircuitBreaker = {
  readonly downstream: string;
  state(): CircuitState;
  allowsCall(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
};

export function circuitBreaker(
  downstream: string,
  settings: CircuitBreakerSettings = defaultCircuitBreakerSettings,
  now: () => number = Date.now
): CircuitBreaker {
  let state: CircuitState = "closed";
  let failuresInARow = 0;
  let successesInARow = 0;
  let openedAt = 0;

  function openTheCircuit(): void {
    state = "open";
    openedAt = now();
    failuresInARow = 0;
    successesInARow = 0;
  }

  return {
    downstream,

    state(): CircuitState {
      if (state === "open" && now() - openedAt >= settings.openDurationInMilliseconds) {
        state = "halfOpen";
      }
      return state;
    },

    allowsCall(): boolean {
      return this.state() !== "open";
    },

    recordSuccess(): void {
      failuresInARow = 0;
      if (state !== "halfOpen") {
        state = "closed";
        return;
      }
      successesInARow = successesInARow + 1;
      if (successesInARow >= settings.successesBeforeClosing) {
        state = "closed";
        successesInARow = 0;
      }
    },

    recordFailure(): void {
      if (state === "halfOpen") {
        openTheCircuit();
        return;
      }
      failuresInARow = failuresInARow + 1;
      if (failuresInARow >= settings.failuresBeforeOpening) {
        openTheCircuit();
      }
    }
  };
}

export async function throughCircuitBreaker<Value>(
  breaker: CircuitBreaker,
  work: () => Promise<Value>
): Promise<Value> {
  if (!breaker.allowsCall()) {
    throw new CircuitOpenError(breaker.downstream);
  }
  try {
    const value = await work();
    breaker.recordSuccess();
    return value;
  } catch (failure) {
    breaker.recordFailure();
    throw failure;
  }
}
```

`subgraphs/cart/src/adapters/catalogue/degradedCatalogueReader.ts`

```ts
import { throughCircuitBreaker, type CircuitBreaker } from "@zappy/shared";
import type { CataloguedProduct, CatalogueReader } from "../../application/ports.js";

export type LastKnownProducts = Map<string, CataloguedProduct>;

export function lastKnownProducts(): LastKnownProducts {
  return new Map<string, CataloguedProduct>();
}

export type DegradationCounters = {
  readonly answeredLive: number;
  readonly answeredFromLastKnown: number;
};

export type DegradedCatalogue = {
  readonly reader: CatalogueReader;
  counters(): DegradationCounters;
};

export function degradedCatalogueReader(
  live: CatalogueReader,
  breaker: CircuitBreaker,
  remembered: LastKnownProducts
): DegradedCatalogue {
  let answeredLive = 0;
  let answeredFromLastKnown = 0;

  function remember(products: readonly CataloguedProduct[]): void {
    for (const product of products) {
      remembered.set(product.id, product);
    }
  }

  return {
    reader: {
      async readProduct(productId: string): Promise<CataloguedProduct | null> {
        try {
          const product = await throughCircuitBreaker(breaker, () => live.readProduct(productId));
          answeredLive = answeredLive + 1;
          if (product !== null) {
            remember([product]);
          }
          return product;
        } catch {
          answeredFromLastKnown = answeredFromLastKnown + 1;
          return remembered.get(productId) ?? null;
        }
      },

      async readProducts(productIdentifiers: readonly string[]): Promise<readonly CataloguedProduct[]> {
        try {
          const products = await throughCircuitBreaker(breaker, () =>
            live.readProducts(productIdentifiers)
          );
          answeredLive = answeredLive + 1;
          remember(products);
          return products;
        } catch {
          answeredFromLastKnown = answeredFromLastKnown + 1;
          return productIdentifiers
            .map((identifier) => remembered.get(identifier))
            .filter((product): product is CataloguedProduct => product !== undefined);
        }
      }
    },

    counters(): DegradationCounters {
      return { answeredLive, answeredFromLastKnown };
    }
  };
}
```

The cart host wires the degradation onto the read path only, and leaves the
write path on the live catalogue:

```ts
const liveCatalogue = entityCatalogueReader(base.forwarded);
const catalogue = degradedCatalogueReader(liveCatalogue, catalogueBreaker, remembered).reader;
const cart = changeCart(carts, liveCatalogue, () => systemClock.now());
```

`subgraphs/cart/tests/degradedCatalogueReader.test.ts` proves the reader
remembers, degrades, answers nothing for a product it never saw, stops calling
once the circuit is open, and goes back to the live catalogue when the open
period has passed. `shared/tests/circuitBreaker.test.ts` proves the state
machine on its own. The chaos test is the last block of
`router/tests/graph.test.ts`, "the graph when the catalogue subgraph is
stopped": it fills a cart through the gateway, stops the catalogue subgraph, and
asks the graph for the cart again. The lines and the subtotal come back
unchanged and there is no error, five times over, and `addToCart` is refused
with the catalogue named in the message.

The trade-off: what to degrade and what to fail. The cart page degrades, because a price that
is a minute old is better than an empty page and the visitor can still see what
is in the cart. Adding a product does not degrade, because it needs the stock of
the moment and a cart line that cannot be honoured is worse than a refusal the
visitor can act on.

### DataLoader and query plans

A federated graph turns a cart with twenty lines into twenty entity lookups
unless somebody batches them. Two DataLoaders do that here.
`Product.__resolveReference` in `catalogue` reads through a loader that lives one
request long, so the gateway's entity fetch for twenty lines costs one database
read. `entityCatalogueReader` in `cart` does the same in the other direction, so
the twenty `lineTotal` resolvers and the subtotal cost `catalogue` one call.
The query plan is where a reader can see it. The gateway hands its plan to a
plugin, which counts the fetches per subgraph and puts the plan on the response
when the request asks for it with the `x-zappy-query-plan` header, in the
development profile only.

`router/src/queryPlanPlugin.ts`

```ts
import type { ApolloServerPlugin } from "@apollo/server";
import {
  serializeQueryPlan,
  type PlanNode,
  type QueryPlan,
  type SubscriptionNode
} from "@apollo/query-planner";
import { currentProfile } from "@zappy/shared";
import type { GatewayContext } from "./gatewayContext.js";

export const queryPlanHeaderName = "x-zappy-query-plan";

export const queryPlanExtensionName = "zappyQueryPlan";

export type QueryPlanSummary = {
  readonly plan: string;
  readonly fetchesPerSubgraph: Readonly<Record<string, number>>;
};

export function summariseQueryPlan(queryPlan: QueryPlan): QueryPlanSummary {
  const fetchesPerSubgraph: Record<string, number> = {};
  countFetches(queryPlan.node, fetchesPerSubgraph);
  return { plan: serializeQueryPlan(queryPlan), fetchesPerSubgraph };
}

function countFetches(
  node: PlanNode | SubscriptionNode | undefined,
  tally: Record<string, number>
): void {
  if (node === undefined) {
    return;
  }
  if (node.kind === "Fetch") {
    tally[node.serviceName] = (tally[node.serviceName] ?? 0) + 1;
    return;
  }
  if (node.kind === "Flatten") {
    countFetches(node.node, tally);
    return;
  }
  if (node.kind === "Sequence" || node.kind === "Parallel") {
    for (const child of node.nodes) {
      countFetches(child, tally);
    }
    return;
  }
  if (node.kind === "Condition") {
    countFetches(node.ifClause, tally);
    countFetches(node.elseClause, tally);
    return;
  }
  if (node.kind === "Subscription") {
    countFetches(node.primary, tally);
    countFetches(node.rest, tally);
    return;
  }
  countFetches(node.primary.node, tally);
  for (const deferred of node.deferred) {
    countFetches(deferred.node, tally);
  }
}

export function queryPlanIsAskedFor(headerValue: string | null | undefined): boolean {
  return currentProfile() === "development" && headerValue !== null && headerValue !== undefined;
}

export function queryPlanPlugin(): ApolloServerPlugin<GatewayContext> {
  return {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          const summary = requestContext.contextValue.rememberedQueryPlan();
          if (summary === null) {
            return;
          }
          if (!queryPlanIsAskedFor(requestContext.request.http?.headers.get(queryPlanHeaderName))) {
            return;
          }
          if (requestContext.response.body.kind !== "single") {
            return;
          }
          requestContext.response.body.singleResult.extensions = {
            ...requestContext.response.body.singleResult.extensions,
            [queryPlanExtensionName]: summary
          };
        }
      };
    }
  };
}
```

`subgraphs/cart/tests/entityCatalogueReader.test.ts` proves the batching: three
line reads in one request are one call to `catalogue`, two lines that want the
same product are one representation, and a second request starts a new batch
because the loader lives one request long. The plan is proved in
`router/tests/graph.test.ts`, "reads the query plan and shows one batched
catalogue fetch for three cart lines": a cart with three different products is
asked for with its product names, and the plan holds exactly one
`Fetch(service: "catalogue")` and one `Fetch(service: "cart")`, which is
`{ cart: 1, catalogue: 1 }`. The test after it proves the plan stays out of a
response that did not ask for it.

The trade-off: limits that protect the graph against limits that block a legitimate screen. The
plan is worth reading and worth keeping out of production, because it tells a
caller how the graph is put together. The header makes it opt in and the profile
makes it unavailable where it should be, which is the same pair the `resetSeed`
mutation uses.

### One trace per request

A request that touches the gateway and three subgraphs is four processes in
production, and a slow request has to be one thing to look at rather than four.
`shared/src/telemetry/requestTracing.ts` registers the OpenTelemetry JavaScript
SDK once per process with the W3C trace context propagator. An Express
middleware opens a span for every incoming request, continuing the trace the
`traceparent` header carries, and the span is the active context for the whole
request, so everything the request starts is a child of it. `askSubgraph` and
the gateway's subgraph data source both write the active context back into a
`traceparent` header, which is what carries the trace across the hop. The
exporter keeps the last two hundred spans in memory, because there is no
collector on this machine.

`shared/src/telemetry/requestTracing.ts`

```ts
import type { IncomingHttpHeaders } from "node:http";
import { context, propagation, SpanStatusCode, trace, type Span, type Tracer } from "@opentelemetry/api";
import { ExportResultCode, W3CTraceContextPropagator, type ExportResult } from "@opentelemetry/core";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor, type ReadableSpan, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

export const tracerName = "zappy-mart";

export const serviceAttributeName = "zappy.service";

export const rememberedSpanCount = 200;

export type RecordedSpan = {
  readonly name: string;
  readonly service: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
};

export type RememberingSpanExporter = SpanExporter & {
  recorded(): readonly RecordedSpan[];
  forgetEverything(): void;
};

export function rememberingSpanExporter(howMany: number = rememberedSpanCount): RememberingSpanExporter {
  const remembered: RecordedSpan[] = [];

  return {
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
      for (const span of spans) {
        remembered.push({
          name: span.name,
          service: String(
            span.attributes[serviceAttributeName] ?? span.resource.attributes[ATTR_SERVICE_NAME] ?? tracerName
          ),
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          parentSpanId: span.parentSpanContext?.spanId ?? null
        });
      }
      while (remembered.length > howMany) {
        remembered.shift();
      }
      resultCallback({ code: ExportResultCode.SUCCESS });
    },

    async shutdown(): Promise<void> {
      remembered.length = 0;
    },

    async forceFlush(): Promise<void> {
      return undefined;
    },

    recorded(): readonly RecordedSpan[] {
      return [...remembered];
    },

    forgetEverything(): void {
      remembered.length = 0;
    }
  };
}

let installedExporter: RememberingSpanExporter | null = null;

export function startRequestTracing(serviceName: string): RememberingSpanExporter {
  if (installedExporter !== null) {
    return installedExporter;
  }
  const exporter = rememberingSpanExporter();
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    spanProcessors: [new SimpleSpanProcessor(exporter)]
  });
  provider.register({ propagator: new W3CTraceContextPropagator() });
  installedExporter = exporter;
  return exporter;
}

export function recordedSpans(): readonly RecordedSpan[] {
  return installedExporter === null ? [] : installedExporter.recorded();
}

export function forgetRecordedSpans(): void {
  installedExporter?.forgetEverything();
}

export function tracer(): Tracer {
  return trace.getTracer(tracerName);
}

export function traceHeadersOfActiveContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

export function currentTraceId(): string | null {
  const span = trace.getActiveSpan();
  if (span === undefined) {
    return null;
  }
  const traceId = span.spanContext().traceId;
  return traceId === "00000000000000000000000000000000" ? null : traceId;
}

export function withRequestSpan<Value>(
  serviceName: string,
  spanName: string,
  incomingHeaders: IncomingHttpHeaders,
  work: (span: Span) => Value
): Value {
  const carrier: Record<string, string> = {};
  for (const [name, value] of Object.entries(incomingHeaders)) {
    if (typeof value === "string") {
      carrier[name] = value;
    }
  }
  const parent = propagation.extract(context.active(), carrier);
  const span = tracer().startSpan(spanName, { attributes: { [serviceAttributeName]: serviceName } }, parent);
  return context.with(trace.setSpan(parent, span), () => work(span));
}

export function endSpanWithOutcome(span: Span, failure: unknown): void {
  if (failure !== null) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: failure instanceof Error ? failure.message : String(failure)
    });
  }
  span.end();
}

export type TracedRequest = {
  readonly method: string;
  readonly headers: IncomingHttpHeaders;
};

export type TracedResponse = {
  on(event: "finish", listener: () => void): unknown;
};

export function requestTracingMiddleware(
  serviceName: string
): (request: TracedRequest, response: TracedResponse, next: () => void) => void {
  return (request, response, next) => {
    withRequestSpan(serviceName, `${serviceName} ${request.method}`, request.headers, (span) => {
      response.on("finish", () => {
        span.end();
      });
      next();
    });
  };
}
```

`shared/tests/requestTracing.test.ts` proves a span produces a well formed
`traceparent`, and that a service which is handed one continues the trace, so
the gateway span is a child of the caller and the subgraph span is a child of
the gateway. The proving test across the graph is
`router/tests/graph.test.ts`, "puts the gateway and every subgraph it called on
one trace": one query for a cart with its products is asked through the gateway,
and the recorded spans hold a gateway span, a cart span and a catalogue span
that all carry one trace id.

The trade-off: the cost of instrumenting everything. Every span is memory and time, and a
process that records them all keeps nothing useful for long. The exporter here
is bounded on purpose. A production graph swaps it for an OTLP exporter to a
collector and adds a sampler, which is one line in this file, and the assertion
the test makes stays the same because the trace id is what joins the services
either way.

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
| `@apollo/query-planner` | 2.14.4 | `serializeQueryPlan`, already inside the gateway and now a direct dependency of `router` |
| `@opentelemetry/api` | 1.9.1 | the tracer, the context and the propagator, the one package the gateway also uses |
| `@opentelemetry/sdk-trace-base` | 2.11.0 | `SimpleSpanProcessor` and the `SpanExporter` the bounded exporter implements |
| `@opentelemetry/sdk-trace-node` | 2.11.0 | `NodeTracerProvider`, which brings the async hooks context manager |
| `@opentelemetry/core` | 2.11.0 | `W3CTraceContextPropagator` and the export result |
| `@opentelemetry/resources` | 2.11.0 | the resource that carries the service name |
| `@opentelemetry/semantic-conventions` | 1.43.0 | `ATTR_SERVICE_NAME` |
| `jose` | 6.2.12 | the JSON web key set and the RS256 signing |
| `argon2` | 0.45.1 | ships a prebuilt binding, no compiler needed |
| `pg` | 8.23.0 | with `@types/pg` 8.23.1, the PostgreSQL 18 profile |
| `@graphql-codegen/cli` | 7.4.0 | with `typescript` 6.1.0, `typescript-resolvers` 6.1.0 and `add` 7.1.0 |
| `typescript` | 6.0.3 | the 6.0 line the family pins, `docs/versions.md` |
| `@types/node` | 26.5.0 | |
| Apollo Router | 2.16.3 | the binary `router/router.yaml` is written for, not run here |
| PostgreSQL | 18 | the documented profile, `docs/versions.md` |
