# The contract

`contract/schema.graphql` is the single source of truth for the shape of
the store's API. Every backend serves it, every frontend consumes it, and
every side derives its types from it.

## The schema

Version 0.1 (8 September 2026) is a first draft that names the types and
operations of `domain.md`. Version 1.0 lands with item Z2, after the seed
data and the expected answers exist, and from then on the schema changes
only through one change that touches the schema, the operations, the
expected answers and every backend together.

Conventions in the schema:

- Full words. `quantity`, not `qty`. `promotionCode`, not `promo`.
- `Money` is an object with an integer `amount` in the smallest unit and a
  `currency` code. Never a float.
- Every mutation answers with a payload type that carries the result and
  a list of `UserError` values, so an expected failure (out of stock, an
  expired code, a wrong password) is data the client renders, and only an
  unexpected failure becomes a GraphQL error.
- Lists that can grow (`products`, `orders`) use `first` and `after`
  cursor pagination from the start, because adding it later changes every
  client.
- Ids are opaque strings.

## Conformance

`contract/seed/` holds the data every backend loads in development and
in the conformance run: the categories, the products with their stock,
the promotion codes with their windows, and one customer with a known
password.

`contract/operations/` holds one `.graphql` document per scenario with its
variables in a `.json` beside it. `contract/expected/` holds the answer
the backend must give, with a small set of placeholders for values that
differ per run (ids, timestamps, tokens).

`tools/conformance/` is a Node runner: it takes a backend URL, resets the
seed through a mutation that exists only in the development profile,
runs every operation in order and compares the answers. A backend is done
when the runner is green. Scenarios include the failures: adding more
than the stock, an expired code, a replayed refresh token, a mutation
without an origin header.

## How the frontends use it

- React Router: gql.tada derives TypeScript types from the schema file,
  urql runs the documents on the server in loaders and actions.
- Next.js: Apollo Client with typed documents generated from the schema.
- Angular: Apollo Angular with generated types.

Each frontend's README shows the generation step, so a schema change is
one command on every side.
