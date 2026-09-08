# The mock server

An in-memory implementation of the whole Zappy Mart contract, served on
port 4000. It exists so that the conformance runner in
`tools/conformance/` has a target before the first backend is written, and
so that the three frontends have a backend to develop against from day
one.

It serves `contract/schema.graphql` version 1.0 together with the
development extension `contract/schema.development.graphql`, and it reads
`contract/seed/` at start and again on every `resetSeed`. Every rule it
answers with comes from `docs/domain.md` and `docs/security.md`.

## What it is

- The whole contract. Every query, every mutation, every `UserErrorCode`
  the schema says applies.
- The shared seed: the four categories, the twenty products in catalogue
  order, the five promotion codes with their windows and recorded uses,
  and the one customer, whose password is hashed while the seed loads.
- The totals rule of `docs/domain.md`, worked in whole cents:
  `total = subtotal + shipping - discount`, shipping 495 cents and zero
  on an empty cart, from a subtotal of 5000 cents, or with a free
  shipping code, a percentage discount rounded half up.
- The security shape of `docs/security.md`: hashed passwords, a short
  lived access token as a signed JSON Web Token, an opaque refresh token
  in an httpOnly cookie, rotation on every refresh with family revocation
  on a replay, the two cookies `zappy_refresh` and `zappy_cart`, and an
  `Origin` check on every mutation.

## What it is not

It stands in for a backend and it is not one. It holds nothing that a
tutorial reader is meant to learn the shape from.

- **No hexagon.** One file per module, no ports, no adapters, no domain
  events. The three monoliths in `backends/` are where the shape is
  taught.
- **No database.** Everything lives in memory and is gone when the
  process stops. Restarting it is the same as `resetSeed`.
- **No rate limiting**, so the `RATE_LIMITED` code of the schema is never
  answered here. `docs/security.md` asks for it and every backend in
  `backends/` carries it. A failed login still answers one code whether
  or not the address is registered, and takes the same time either way.
- **Passwords are hashed with scrypt from `node:crypto`**, not with
  Argon2id. Argon2 needs a native dependency, and this stand in keeps to
  what Node ships. Every backend in `backends/` uses Argon2id, as
  `docs/security.md` requires.
- **`resetSeed` is always available.** A real backend loads the
  development extension only in its development profile. This server has
  no other profile.
- **`placeOrder(idempotencyKey)` is accepted and ignored**, the way the
  schema says the monoliths treat it. A second call on the emptied cart
  answers `CART_EMPTY`. Storing the key with the order belongs to the
  federated backend.

## Starting it

```
cd tools/mock-server
npm install
node server.mjs
```

It prints the endpoint it serves:

```
Zappy Mart mock server is serving http://localhost:4000/graphql
```

Opening that address in a browser gives the Apollo sandbox, which is why
`http://localhost:4000` is one of the allowed origins.

Two environment variables change the defaults:

| Variable | Default | What it does |
|---|---|---|
| `ZAPPY_MOCK_PORT` | `4000` | the port to listen on |
| `ZAPPY_ALLOWED_ORIGINS` | the four below | a comma separated list of origins whose mutations are accepted |

The allowed origins default to the three frontend development servers
plus the server's own address, so the sandbox can run a mutation:

```
http://localhost:5173   the React Router frontend
http://localhost:3001   the Next.js frontend
http://localhost:4200   the Angular frontend
http://localhost:4000   this server's sandbox
```

## Every frontend points at it during development

`frontends/react-router/`, `frontends/nextjs/` and `frontends/angular/`
each take a GraphQL endpoint from their own configuration. During
development every one of them points at `http://localhost:4000/graphql`,
so a screen can be built and run before any backend exists. When a
backend is ready the endpoint changes and nothing else does, because both
sides answer the same schema.

A browser request has to send cookies, so every client sets credentials
on the request: `credentials: "include"` in a fetch, `withCredentials` in
Apollo Angular's HTTP link. Without that the anonymous cart cannot follow
the visitor and the refresh cookie never arrives.

## One request per operation

The catalogue, which needs no cookie and no origin:

```
curl -s http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ products(first: 2) { totalCount edges { cursor node { id name price { amount currency } stock } } } }"}'
```

A mutation, which needs an allowed origin and a cookie jar:

```
curl -s http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -c cookies.txt -b cookies.txt \
  -d '{"query":"mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { subtotal { amount } shipping { amount } total { amount } } availableStock errors { code message field } } }"}'
```

The same mutation without the `Origin` header is refused before the
resolver runs, with HTTP 403 and a GraphQL error whose
`extensions.code` is `ORIGIN_NOT_ALLOWED`, never a `UserError`.

Signing in as the seed customer, whose password is in
`contract/seed/customers.json`:

```
curl -s http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -c cookies.txt -b cookies.txt \
  -d '{"query":"mutation { login(input: { email: \"jane@example.com\", password: \"correct horse battery staple\", device: \"Curl on Windows\" }) { customer { id name } accessToken accessTokenExpiresAt errors { code message } } }"}'
```

The access token goes back as `Authorization: Bearer <token>` on every
request that needs a customer. The refresh token never leaves the cookie.

Emptying the store and loading the seed again:

```
curl -s http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { resetSeed { success loadedProducts errors { code } } }"}'
```

## The files

| File | Holds |
|---|---|
| `state.mjs` | the store, the seed loading and reloading, `Money`, the moment format and the `UserError` shape |
| `catalogue.mjs` | products, categories, the filter, and the cursor paging both connections use |
| `cart.mjs` | the cart, its lines, the totals rule, the promotion on a cart, and the merge of an anonymous cart on login |
| `promotions.mjs` | the three kinds of code, their windows, limits and minimums, and what each takes off |
| `ordering.mjs` | placing an order from a cart, stock reservation, the order history |
| `accounts.mjs` | passwords, email addresses, access and refresh tokens, sessions, the wishlist |
| `server.mjs` | the schema, the resolver map, the cookies, the `Origin` check and the HTTP endpoint |
| `tests/` | one `node:test` file per module plus `server.test.mjs`, which drives the whole contract over HTTP |

`server.mjs` is the only file that knows about HTTP. Every module exports
plain functions over the store, which is what the tests call, and a
resolver map, which `server.mjs` composes into one.

## Running the tests

```
npm test
```

which is `node --test`. It runs every `*.test.mjs` file under `tests/`.
The server tests start the server on a free port, so they run beside a
server that is already serving 4000.

## The conformance run

With the server running on 4000:

```
node ../conformance/run.mjs --url http://localhost:4000/graphql
```

The runner resets the seed, walks the scenarios of
`contract/operations/` in the order `tools/conformance/documents.mjs`
fixes, and compares every answer with `contract/expected/`. The scenarios
build on one another, so they run in that order against one cookie jar.

## Decisions a reader may want the reason for

**An empty cart is charged nothing.** A cart with no lines answers a
subtotal of 0, shipping of 0 and a total of 0, because there is nothing
to ship. The charge comes back with the first line and goes again when
the last one is removed, and a cart emptied by `placeOrder` is at zero
too. A code left on an empty cart takes nothing off, so the equation
still holds.

**The anonymous wishlist is kept against `zappy_cart`, like the cart.**
An anonymous visitor may save a product, and `addToWishlist` opens the
anonymous identity and sets the cookie the same way `addToCart` does. On
`login` and `register` the saved products move to the customer, next to
the cart. `contract/expected/wishlist-add.json` and
`contract/expected/wishlist-merge-on-login.json` fix this behaviour: both
run with no signed in customer and both expect the change to be made.
`Query.wishlist` answers the same list, so a wishlist screen shows what
`addToWishlist` just returned.

The sentence in `contract/schema.graphql` under `Query.wishlist` that an
anonymous visitor's wishlist "lives in the browser" is the one place the
contract disagrees with itself. The expected answers are the stricter
statement, so this server follows them, and `NOT_AUTHENTICATED` is
consequently never answered by the two wishlist mutations.

**A revoked session stops accepting its access token at once.** Every
request that carries a bearer token is checked against the session it
names, so a `logout` or a `revokeSession` takes effect immediately. That
is the reason `docs/security.md` gives for keeping a session table beside
the token. The sentence under `Mutation.logout` in the schema allows a
backend to let the token live out its fifteen minutes instead. This
server takes the stricter of the two, which no expected answer
distinguishes.

**A session is its own family.** A login opens one session, and every
refresh token that descends from it belongs to that session. Presenting a
token that was already rotated revokes the session and every token under
it, which is the family revocation of `docs/security.md`.

**A cursor is the base64 of a kind and an id.** It is opaque, it is
stable across a `resetSeed`, and a cursor that names an item which is not
in the list answers an empty page.

**The refresh cookie's path is `/graphql`.** The design in
`docs/security.md` limits it to the refresh mutation. A GraphQL API has
one endpoint, so the endpoint's path is as narrow as a path can be here.
