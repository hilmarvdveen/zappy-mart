# The contract

One GraphQL schema, one set of seed data, one set of operations and one
expected answer per operation. Every backend serves this, every frontend
consumes it, and a backend is finished when the runner in
`../tools/conformance/` is green against it.

| Path | Holds |
|---|---|
| `schema.graphql` | the schema, version 1.0, the single source of truth for the shape of the API |
| `schema.development.graphql` | one extra mutation, `resetSeed`, that a backend serves in its development profile only |
| `seed/` | the categories, products, promotion codes and the one customer every backend loads, described field by field in `seed/seed.md` |
| `operations/` | one document per scenario with its variables beside it, in the order `operations/README.md` fixes |
| `expected/` | the answer each scenario has to give, with placeholders for the values that differ per run |

Read `seed/seed.md` first, then `operations/README.md`. The reasoning
behind the whole thing is in `../docs/contract.md`.

## Running the conformance suite

```
cd tools/conformance
npm install
node run.mjs --url http://localhost:5000/graphql
```

The runner validates every document against
`schema.graphql` plus `schema.development.graphql` before it opens a
connection, calls `resetSeed`, runs the thirty three scenarios in order
and compares each answer with the file of the same name in `expected/`.
It prints one line per scenario and stops at the first difference with a
diff that names the path, the expected value and the value it got.

## What the run carries from one scenario to the next

The scenarios are one session with a store, not thirty three independent
requests.

- **The access token.** Every answer that carries an `accessToken` sets
  the `Authorization: Bearer` header of every request after it. A logout
  that succeeds throws it away again, the way a client does.
- **The cookies.** `zappy_cart` and `zappy_refresh` live in a cookie jar
  that follows `Set-Cookie` and its expiry. The jar keeps the previous
  value of `zappy_refresh` as well, because `refresh-session-replayed`
  presents the rotated token on purpose.
- **The cart.** It is built anonymously, discounted by the promotion
  scenarios, moved to a customer by the registration, and bought by the
  order scenario.
- **Three ids.** The id of the session a request is made from, the id of
  another session of the same customer, and the id of the placed order. A
  variables file writes them as `$sessionId`, `$otherSessionId` and
  `$orderId`, and the runner fills them in from the answer that carried
  them. `revoke-session` ends the login on the other device that way, and
  `revoke-session-signed-out` and `order-by-id` take the other two.

## The origin

Every request carries `Origin: http://localhost:5173`, which is the
development origin of the React Router frontend and the value a backend
allows in its development profile. The last scenario,
`mutation-without-origin`, sends no `Origin` at all and expects the
mutation to be refused before the resolver runs, as
`../docs/security.md` asks.

## What the expected answers fix that the schema leaves open

A conformance suite has to answer questions the schema states in prose.
These five are settled here, and a backend follows them.

1. **A merge adds, it never replaces.** When an anonymous cart moves to a
   customer on register or login, its lines are added to the customer's
   cart and a product that is already there has its quantity raised. An
   empty anonymous cart leaves the customer's cart as it was. The
   wishlist merges the same way.
2. **The cookie is cleared when the cart moves.** A backend that moves an
   anonymous cart to a customer clears `zappy_cart`, so the next customer
   to sign in on that machine does not inherit it.
3. **The anonymous wishlist rides the same cookie as the anonymous
   cart**, as `../docs/security.md` says, so `addToWishlist` works before
   a visitor signs in and the list merges on login.
4. **The `field` of a `UserError`** is the argument the rule refused:
   `quantity` for `OUT_OF_STOCK`, `code` for the four promotion codes,
   `input.email` for `EMAIL_TAKEN`, and null where the refusal belongs to
   the whole operation, as it does for `CREDENTIALS_INVALID`,
   `SESSION_INVALID`, `NOT_AUTHENTICATED` and `CART_EMPTY`.
5. **The session a login makes is the current one in its own answer.**
   `Session.current` is true for the session the request is made from,
   and a login answers for the session it has just created, whatever
   bearer token the request happened to carry. `login-second-device`
   holds that expectation: two sessions, the newest first, the phone
   current and the laptop not.

## Changing the contract

The schema, the seed, the operations, the expected answers and every
backend move in one change. That is the rule `../docs/contract.md` sets,
and the runner is what proves it was kept.
