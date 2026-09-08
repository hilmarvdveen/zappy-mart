# The Node.js backend: the federated variant

The three monoliths show one store as five modules in one process. The
Node.js backend shows the same store as five services behind one graph:
Apollo Federation, with a subgraph per module and a supergraph the client
cannot tell apart from the monoliths. The conformance runner proves that:
it runs against the router the way it runs against the C# host, and the
supergraph's API schema must equal `contract/schema.graphql`.

Written 9 September 2026 from a Senior and Principal Backend Engineer
role at an international retail organisation (Node.js and TypeScript,
REST and GraphQL, Apollo Federation with subgraphs and a supergraph,
microservices under high traffic, and a technical context of type
safety, distributed systems, caching and cache invalidation, data
consistency, event-driven versus request-driven architectures,
idempotency, retries, delivery guarantees and resilience). This backend
exists so that every one of those words has a place in running code and
a trade-off that can be explained.

## Why the client side is GraphQL only

A federated graph is the migration path away from REST: the router goes
in front, a subgraph takes over one capability at a time, and the REST
endpoint for that capability retires. So the client facing side of this
backend has no REST at all. Three edges stay outside the graph on
purpose, and the walk through names them: the health and readiness
endpoints the platform probes, the JWKS endpoint that publishes the
signing keys, and the simulated payment provider webhook. Those are
machine to machine and belong to HTTP, which is the H17 argument.

## The subgraphs

Each subgraph is a small hexagon in TypeScript on Node.js 24 with Apollo
Server 5 and `@apollo/subgraph`, its own PostgreSQL schema, its own tests
and its own container. The same module names as the monoliths, so the
reader sees module boundaries become service boundaries.

| Subgraph | Owns | References | Publishes | Consumes |
|---|---|---|---|---|
| `catalogue` | `Product`, `Category`, stock | | `ProductChanged`, `StockReserved`, `StockReleased` | `OrderPlaced` (reserves stock) |
| `cart` | `Cart`, `CartLine`, the anonymous cart | `Product` by key | | `ProductChanged` (price on a line) |
| `promotions` | `PromotionCode`, the rules, `Cart.promotion` | `Cart` by key | | `OrderPlaced` (counts a use) |
| `ordering` | `Order`, `OrderLine`, `placeOrder`, the outbox | `Cart`, `Product`, `Customer` by key | `OrderPlaced` | `StockReserved`, `StockReleased` |
| `accounts` | `Customer`, `Session`, the wishlist, the tokens | `Product` by key (wishlist) | `CustomerRegistered` | |

Entities carry `@key(fields: "id")`. A subgraph that references an entity
resolves it through the entity reference resolver of the owner, with a
DataLoader per request so a cart with twenty lines costs one catalogue
call, not twenty.

## The supergraph

`rover supergraph compose` builds `supergraph.graphql` from the five
subgraph schemas, and Apollo Router serves it. `router.yaml` carries the
header propagation (Authorization and the two cookies to every subgraph),
CORS and the origin check, per subgraph timeouts and rate limits,
automatic persisted queries, depth and cost limits, and OpenTelemetry
export. A script in `tools/` compares the composed API schema with
`contract/schema.graphql` and fails on any difference, so the federated
backend and the monoliths stay one contract.

Authentication stays distributed: `accounts` issues RS256 tokens and
publishes its public key at a JWKS endpoint, every subgraph verifies the
access token with that key and trusts nothing else, and the router only
forwards the header. That is the pattern the reader meets in a company
with many teams, where no single service is allowed to be the gate.

## Every topic from the role, and where it lives

| Topic | Where | What the reader sees | The trade-off written next to it |
|---|---|---|---|
| Type safety | `graphql-codegen` typed resolvers per subgraph, types from the supergraph in the frontends | a resolver that cannot return the wrong shape | generated types against hand written ones, and what a schema change costs |
| Caching and invalidation | catalogue reads cached per subgraph with `@cacheControl` hints, invalidated by `ProductChanged`, automatic persisted queries in the router, the cart never cached | a product read that stops hitting the database, and a price change that reaches the cache | how long a stale price is acceptable against how much invalidation logic a team can carry |
| Data consistency | `placeOrder` reserves stock in `catalogue` with an idempotency key and releases it on failure, the order and its outbox row in one transaction | an order that never exists without its stock, and no stock held without its order | a saga of two steps against a distributed transaction, and what happens when the second step times out |
| Event-driven against request-driven | promotion validation is a request from `cart` to `promotions`, counting a use is the `OrderPlaced` event | one capability done both ways, side by side | latency and coupling against eventual consistency, decided per interaction |
| Idempotency | an `Idempotency-Key` on `placeOrder` with the stored answer replayed, consumers keyed by event id | a double click that places one order | where the keys live and how long they are kept |
| Retries | exponential backoff with jitter on idempotent calls only, a retry budget per subgraph, the outbox publisher's retry | a subgraph that recovers from a blip without a storm | when a retry makes an outage worse |
| Delivery guarantees | the outbox table with a poller, at least once delivery, idempotent consumers, a dead letter after the last retry | an `OrderPlaced` event that survives a crash between the commit and the publish | at most once against at least once, and why exactly once is a property of the consumer |
| Resilience | timeouts per hop, a circuit breaker per downstream, a bulkhead per subgraph, the cart rendering with product stubs when `catalogue` is down | a chaos test that stops one subgraph and asserts the page still answers | what to degrade and what to fail |
| Performance under traffic | DataLoader per request, query plans read in the router, depth and cost limits, connection pools sized | the query plan of the catalogue page and the N+1 it avoids | limits that protect the graph against limits that block a legitimate screen |
| Observability | one trace per request across the router and every subgraph, structured logs with the trace id | a slow request found in one trace | the cost of instrumenting everything |
| CI and delivery | composition checked on every change, the contract diff, per subgraph tests, one Compose file for the whole graph | a schema change that cannot merge if it breaks the supergraph | schema checks against a registry, and what a registry adds |

## Increments

| Item | Work | Done when |
|---|---|---|
| Z11a | The five subgraphs, the router, the composed supergraph, the contract diff script, the security model | the conformance runner is green against the router, every subgraph has unit and integration tests, the walk through runs from an empty folder |
| Z11b | The topics table above, one named place per topic with a test that proves it (the chaos test, the idempotency replay, the outbox crash test, the cache invalidation test) | every row in the table points at a file and a test |
| Z11c | Continuous integration with composition and contract checks, one Compose file for the graph with PostgreSQL and the outbox poller, the OpenTelemetry collector | a change that breaks composition cannot merge |

## Versions to verify at Z11

`@apollo/subgraph`, Apollo Router (the Rust binary and its `router.yaml`
schema), Rover, `@graphql-codegen/*` with the typed resolvers plugin,
DataLoader, the OpenTelemetry JavaScript SDK, a circuit breaker library
(candidate `opossum`), the PostgreSQL client (`pg` or `postgres`), and
whether the router's JWT authentication is available outside the paid
tiers at the time of writing. Apollo Server 5.5.1, Express 5.2.1,
`graphql` 17.0.2 and Node.js 24 are already in `versions.md`.

## What the blog takes from it

H19 in the blog backlog: Apollo Federation in production, explained by
building one. The record has GraphQL as a contract across up to six
teams at bol.com, which is the problem federation solves, and no
federation in production, so the post says it is built to answer the
question and shows the code.
