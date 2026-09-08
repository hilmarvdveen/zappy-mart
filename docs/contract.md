# The contract

`contract/schema.graphql` is the single source of truth for the shape of
the store's API. Every backend serves it, every frontend consumes it, and
every side derives its types from it. `contract/README.md` is the entry
point of the folder itself.

## The schema

Version 1.0, 9 September 2026, delivered with item Z2 together with the
seed data, the conformance operations, the expected answers and the
runner. Version 0.1 was the draft that named the types of `domain.md`.
From 1.0 the schema changes only through one change that touches the
schema, the seed, the operations, the expected answers and every backend
together.

Conventions in the schema:

- Full words. `quantity`, not `qty`. `promotionCode`, not `promo`.
- `Money` is an object with an integer `amount` in the smallest unit and a
  `currency` code. Never a float.
- Every mutation answers with a payload type that carries the result and
  a list of `UserError` values, so an expected failure (out of stock, an
  expired code, a wrong password) is data the client renders, and only an
  unexpected failure becomes a GraphQL error.
- `UserErrorCode` is a closed list. A new code is a change to the schema,
  the expected answers and every backend together, so a client that
  handles every value today handles every value tomorrow.
- Lists that can grow (`products`, `orders`) use `first` and `after`
  cursor pagination from the start, because adding it later changes every
  client. A page is at most one hundred, and a larger `first` is answered
  with one hundred rather than refused.
- Ids are opaque strings.

`contract/schema.development.graphql` adds one field, `resetSeed`, which
a backend serves in its development profile and never in production. It
empties the store and loads `contract/seed/` again.

## Conformance

`contract/seed/` holds the data every backend loads in development and in
the conformance run: four categories, twenty products with their stock,
five promotion codes with their windows, and one customer with a known
password. `contract/seed/seed.md` describes every field and works the
totals through.

`contract/operations/` holds one `.graphql` document per scenario with its
variables in a `.json` beside it. `contract/expected/` holds the answer
the backend must give under the same name.

`tools/conformance/` is the runner. It takes a backend url, validates
every document against the schema before it opens a connection, resets
the seed, runs the scenarios in order and compares the answers. A backend
is finished when the runner is green.

```
cd tools/conformance
npm install
node run.mjs --url http://localhost:5000/graphql
```

### The thirty three scenarios

They run in one order, listed with what each proves in
`contract/operations/README.md`, and they are one session with the store
rather than thirty three separate requests.

| Group | Scenarios |
|---|---|
| Catalogue | `catalogue-list`, `catalogue-filter-by-category`, `product-by-slug`, `product-unknown-slug` |
| Cart | `cart-add`, `cart-add-again-raises-quantity`, `cart-add-above-stock` |
| Promotions | `promotion-apply-percentage`, `promotion-apply-expired`, `promotion-apply-exhausted`, `promotion-apply-below-minimum`, `promotion-replace`, `promotion-remove` |
| Accounts | `register`, `register-duplicate-email`, `login`, `login-wrong-password` |
| Sessions | `refresh-session`, `refresh-session-replayed`, `logout`, `login-again`, `login-second-device`, `revoke-session`, `logout-again`, `revoke-session-signed-out` |
| Wishlist | `wishlist-add`, `wishlist-remove`, `wishlist-merge-on-login` |
| Ordering | `order-place`, `order-place-empty-cart`, `orders-list`, `order-by-id` |
| Transport | `mutation-without-origin` |

The session group is a customer's device list end to end. The seed
customer signs in on a `laptop` and then on a `phone`, so the answer of
`login-second-device` holds two sessions with the phone as the current
one, `revoke-session` ends the laptop and answers with the phone alone,
and `revoke-session-signed-out` is the same mutation after a logout.

The failures are as much of the suite as the happy paths: adding more
than the stock, an expired code, a code at its usage limit, a code under
its minimum, a taken email address, a wrong password, a replayed refresh
token, a revocation with nobody signed in, an order from an empty cart
and a mutation with no origin.

### The numbers come from the seed

Every amount in `contract/expected/` follows from
`contract/seed/products.json` and the totals rule in `domain.md`, and a
wrong number there is a bug in the contract rather than in a backend. The
cart the run builds is three of `product-19` at 795 cents, which is 2385.
Under 5000 it pays the shipping charge of 495, ten percent of it is 238.5
and rounds half up to 239, and it stays under the 2500 minimum of
`FIVEOFF`, so one cart reaches the percentage rule, the shipping rule,
the rounding rule and the minimum refusal.

### The placeholders

Where a value is made at run time the expected answer carries a
placeholder and the runner accepts any value of that shape: `@id` for a
string the backend chooses, `@dateTime` for an ISO moment in UTC with
second precision, `@token` for a JSON Web Token of three parts, and
`@cursor` for a pagination cursor. Everything else is compared exactly,
the seed customer's `customer-01` and `2026-01-15T09:00:00Z` included.
`contract/expected/README.md` holds the table.

### What the run carries from one scenario to the next

- **The access token.** Every answer with an `accessToken` sets the
  `Authorization: Bearer` header of the requests after it. A `logout`
  that answers `success` throws it away, the way a client does, so the
  scenarios after it are anonymous again.
- **The cookies.** `zappy_cart` and `zappy_refresh` live in a jar that
  follows `Set-Cookie` and its expiry. The jar also keeps the value
  `zappy_refresh` had before the last rotation, because
  `refresh-session-replayed` presents the rotated token on purpose and
  expects `SESSION_INVALID`.
- **The cart.** It is built anonymously, discounted by the promotion
  scenarios, moved to a customer by the registration and bought by the
  order scenario.
- **Three ids.** The current session's id, the id of another session of
  the same customer, and the placed order's id. Their variables files
  write them as `$sessionId`, `$otherSessionId` and `$orderId`, which is
  how `revoke-session` ends the login on the laptop while the run is
  signed in on the phone.

### The origin

Every request carries `Origin: http://localhost:5173`, the development
origin of the React Router frontend, which a backend allows in its
development profile. `--origin` changes it. The last scenario,
`mutation-without-origin`, sends no origin at all and expects the
mutation to be refused before the resolver runs, with a GraphQL error and
no data, as `security.md` asks.

### What the expected answers settle

Five rules the schema states in prose are fixed by the expected answers,
and `contract/README.md` writes them out: a merge adds and never
replaces, the `zappy_cart` cookie is cleared when the cart moves to a
customer, the anonymous wishlist rides that same cookie, the `field` of a
`UserError` is the argument the rule refused, and the session a login
makes is the current one in that login's own answer.

## How the frontends use it

- React Router: gql.tada derives TypeScript types from the schema file,
  urql runs the documents on the server in loaders and actions.
- Next.js: Apollo Client with typed documents generated from the schema.
- Angular: Apollo Angular with generated types.

Each frontend's README shows the generation step, so a schema change is
one command on every side.
