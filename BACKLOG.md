# Zappy Mart: the backlog

Zappy Mart is one small web store built several times over, so that a
reader of the blog at hilmarvanderveen.com can open a working application
for every stack the articles explain, read it end to end, and build it
themselves. The store is the same in every version: the same catalogue,
the same cart, the same checkout, the same accounts, the same promotion
codes, and one GraphQL schema that every backend serves and every frontend
consumes. Nothing is deployed. The value is in the code and the walk
through beside it.

The repository is Hilmar's `zappy-mart` on GitHub, which began in April
2025 as an Angular product listing page with a persistent wishlist
(`frontends/angular/`). The family grows from there.

Started 8 September 2026 on Hilmar's brief: working apps that follow DRY
and SOLID where those principles make the code easier to read and change,
and that let go of them where they would not. No abbreviations. Hexagonal
monoliths on the backend. Secure sessions with JWT. The design patterns
that earn their place. Kotlin as a first class backend next to C# and
Java. Every project doubles as a tutorial.

## 1. What gets built

One repository, `zappy-mart`, with one contract and seven applications.
Every backend serves the same schema, every frontend consumes it, so any
frontend runs against any backend. Three monoliths, one federated graph,
three frontends.

| Folder | What | Stack, from the verified table dated 7 September 2026 | Backs |
|---|---|---|---|
| `contract/` | The GraphQL schema, the conformance operations and their expected answers | GraphQL, `graphql` 17.0.2 for the runner | every post on the contract |
| `backends/dotnet/` | The store as a hexagonal monolith in C# | .NET 10 (10.0.11), C# 14, EF Core 10, Hot Chocolate (version to verify) | the C# posts, H17 |
| `backends/java/` | The same monolith in Java | JDK 25, Spring Boot 4.1.1, Spring for GraphQL 2.0.4, Spring Data JPA | the Java posts |
| `backends/kotlin/` | The same monolith in Kotlin | Kotlin 2.4.10, Spring Boot 4.1.1, Spring for GraphQL 2.0.4 (graphql-kotlin is a 2025 alpha, so no) | the Kotlin posts, H16 |
| `frontends/react-router/` | The store front in React Router framework mode with loaders and actions | React Router 8.3.1, React 19.2, urql and gql.tada (versions to verify), Vite | the React Router post, H17 |
| `frontends/nextjs/` | The store front on the App Router with server components | Next.js 16.3, React 19.2, Apollo Client 4.2.12 | H16 |
| `frontends/angular/` | The store front, grown from the existing product listing page, with standalone components and signals | Angular 22.1.5, TypeScript 6.0, Apollo Angular (version to verify) | the Angular posts |
| `backends/node/` | The same store as five subgraphs behind an Apollo Router supergraph, GraphQL only on the client side, with caching, idempotency, the outbox, retries and resilience each in a named place (`docs/federation.md`) | Node.js 24, Apollo Server 5.5.1 with `@apollo/subgraph`, Apollo Router and Rover (to verify), PostgreSQL 18 | H16, H19 |

Every version above is the one the blog explains with. A version that is
not in the table (Hot Chocolate, EF Core patch, urql, gql.tada, Apollo
Angular, Playwright, Vitest, PostgreSQL) is verified and added to
`docs/versions.md` before the first line of code that uses it.

## 2. The rules every project follows

Written out in `docs/principles.md`. The short form:

1. **Readability first.** DRY and SOLID serve readability. When an
   abstraction makes the code harder to follow, or when one change would
   have to be made in one place anyway, the abstraction goes. When the same
   rule has to change in three places, the duplication goes.
2. **Duplication across languages is fine.** Each backend is a complete
   tutorial on its own. Inside one backend, every business rule has one
   home.
3. **No abbreviations, no comments.** Names carry the meaning, the
   markdown beside the code carries the reasoning. `quantity`, not `qty`.
   The accepted short names are `id`, `url` and the language's own idioms.
4. **The hexagon is the shape.** Domain in the middle with no framework
   import, use cases around it, adapters on the outside: GraphQL in,
   persistence and mail out. The test for the shape: the domain module
   compiles without the web or database packages.
5. **One monolith, five modules.** Catalogue, Cart, Ordering, Accounts,
   Promotions. Modules talk through use cases and domain events, never
   through each other's tables.
6. **Patterns where they pay.** Each pattern in `docs/patterns.md` names
   the one place it lives and the problem it solves there. A pattern with
   no problem is not used.
7. **Every project is a tutorial.** Its README goes from an empty folder to
   a running application: the create commands, every file with its path,
   the run command, one request per operation with its response, the test
   command and what a passing run prints. The same rule as the blog.
8. **Tests are the second reader.** Domain rules have unit tests, adapters
   have integration tests against a real database in a container,
   every backend passes the shared conformance suite, every frontend
   passes the shared end to end suite.
9. **Security is not a chapter at the end.** Passwords hashed with
   Argon2id, short lived access tokens, rotating refresh tokens in
   httpOnly cookies backed by a session table, origin checks on cookie
   authenticated mutations, rate limits on login. `docs/security.md`
   explains the two models and when each fits.
10. **Versions are pinned and dated.** `docs/versions.md` is the one
    place. A post cites the version the project runs.

## 3. The domain

Written out in `docs/domain.md`. The store sells a small catalogue of
physical products. Five modules:

| Module | Owns | Rules that live there |
|---|---|---|
| Catalogue | products, categories, prices, stock | a product has one price in one currency, a product with zero stock is shown and cannot be added to a cart |
| Cart | the customer's cart and its lines | a line has a quantity of at least one, adding an existing product raises the quantity, the cart total is derived and never stored |
| Promotions | promotion codes and their rules | a percentage code, a fixed amount code, a free shipping code, one code per cart, a code has a validity window and a usage limit |
| Ordering | placing an order from a cart, order history | an order is placed from a non empty cart, stock is reserved when the order is placed, the order keeps the prices of that moment, payment is simulated |
| Accounts | customers, registration, login, sessions, the wishlist | an email address is unique, a password is never stored, a session is revocable, a wishlist belongs to a customer and an anonymous wishlist lives in the browser until login, when it merges |

What is deliberately out: real payment, shipping, an admin interface,
product images beyond a placeholder, search beyond a name filter. Each
would double the size without teaching anything new.

## 4. The contract

`contract/schema.graphql` is the single source. Version 0.1 is in the
repository now. The types: `Product`, `Category`, `Money`, `Cart`,
`CartLine`, `Order`, `OrderLine`, `Customer`, `AuthenticationPayload`.
The queries: `products`, `product`, `categories`, `cart`, `wishlist`,
`me`, `orders`, `order`. The mutations: `register`, `login`, `logout`,
`refreshSession`, `revokeSession`, `addToCart`, `changeCartLineQuantity`,
`removeCartLine`, `applyPromotionCode`, `removePromotionCode`,
`addToWishlist`, `removeFromWishlist`, `placeOrder`.

Conformance: `contract/operations/` holds one `.graphql` document per
operation with its variables, and `contract/expected/` the answer each
backend must give from the shared seed data. A small Node runner
(`tools/conformance/`) takes a backend URL and runs the whole set. A
backend is done when the runner is green. This is the DRY device across
three languages: one set of expectations, three implementations.

The schema changes only through a pull request that changes the schema,
the operations, the expected answers and every backend in one go.

## 5. Security, the two models side by side

Written out in `docs/security.md`. Every backend implements the same
model, every frontend uses it in the way its runtime allows.

- **Accounts issue two tokens.** An access token as a JWT, signed with an
  asymmetric key, fifteen minutes of life, carrying the customer id and
  nothing personal. A refresh token, random and opaque, thirty days,
  stored hashed in a `sessions` table with the device and the time, so a
  session can be listed and revoked.
- **The cookie carries the refresh token**, httpOnly, Secure, SameSite
  Lax, path limited to the refresh mutation. The access token travels in
  the Authorization header.
- **Rotation on every refresh.** A refresh token is used once. Reuse of a
  rotated token revokes the whole session family.
- **Where the tokens live per frontend.** React Router and Next.js keep
  them on the server: the browser holds one session cookie for the
  frontend, the frontend's server calls the API with the access token
  (the backend for frontend shape). Angular is a single page application
  and holds the access token in memory only, with an interceptor that
  refreshes through the cookie.
- **Origin checks on cookie authenticated mutations**, rate limits on
  login and register, Argon2id for passwords, a constant time comparison
  everywhere a secret is compared, no secret in a log line.
- **What is shown and explained**: why not a JWT alone (revocation), why
  not a server session alone (every request hits the table), when a pure
  session is the better choice (one server, one domain, simple), when
  the token pair is (several clients, a mobile app, an API for partners).

## 6. The patterns, and where each one lives

Written out in `docs/patterns.md` once the C# backend exists, with file
paths. The list the projects commit to:

| Pattern | Where | The problem it solves there |
|---|---|---|
| Ports and adapters | the whole backend | the domain knows nothing of GraphQL or the database |
| Repository as a port | one interface per aggregate in the application layer | the use case reads and stores aggregates without knowing the table |
| Unit of work | one transaction per use case | a placed order and its stock reservation succeed or fail together |
| Result type | every use case answer, a sealed outcome | expected failures (out of stock, code expired) are values, not exceptions |
| Specification | catalogue filtering | a filter composed from parts, testable without a database |
| Strategy | promotion rules | a percentage, an amount and free shipping share one interface and one place to add a fourth |
| Factory | `Order.place(cart, moment)` | an order is created in one valid shape only |
| Domain events with an in process dispatcher | order placed | stock reservation and the confirmation mail react to the event without the ordering module knowing them |
| Decorator | the catalogue query port | caching wraps the repository without touching it |
| Value objects | `Money`, `EmailAddress`, `PromotionCode` | a wrong value cannot exist |
| Builder in tests | test data | a readable test that names only what matters |

Left out on purpose, with the reason in the doc: a mediator library
(indirection for a monolith of this size), generic repositories (they hide
the queries that matter), an anaemic service layer, and a separate DTO
for every type where the GraphQL type already is the boundary.

## 7. The frontends, one shape three times

Every frontend has the same six screens: catalogue with category filter,
product, cart, checkout, order confirmation, account with order history
and sessions. The same Playwright suite in `tools/end-to-end/` runs
against each one. Styling with Tailwind, plain and the same across the
three, so the reader compares the frameworks and not the design.

| Frontend | What the reader learns from it |
|---|---|
| React Router | loaders and actions as the data layer, the session on the server, progressive enhancement of the cart forms, typed queries with gql.tada, error boundaries per route |
| Next.js | server components that query, server actions that mutate, the route handler as the backend for frontend, streaming the catalogue, the cache and when to invalidate it |
| Angular | standalone components and signals, `resource` for the queries, an interceptor for the token and the refresh, zoneless change detection, `OnPush` by default |

## 8. Phases and items

Effort is in agent hours, as in the blog backlog. Every item is done when
its tests are green, its README walks from an empty folder to a running
application, and the shared suites pass where they apply.

| Item | Work | Depends on | Effort | Status |
|---|---|---|---|---|
| Z0 | The skeleton: repository, principles, domain, contract 0.1, versions, this backlog | | 2 | done 8 September 2026 |
| Z1 | Verify and pin the missing versions (Hot Chocolate, EF Core, urql, gql.tada, Apollo Angular, Playwright, Vitest, PostgreSQL, Argon2 libraries per language) into `docs/versions.md` | Z0 | 1 | done 8 September 2026 |
| Z2 | The contract finished: schema 1.0, seed data, conformance operations and expected answers, the runner | Z1 | 4 | done 9 September 2026: 33 scenarios in one session, 49 runner tests, five settled rules in `contract/README.md` |
| Z2c | `tools/mock-server`, an in-memory implementation of the whole contract over the seed on port 4000: the first target the runner was proven against (33 of 33) and the backend the three frontends develop against until the real ones are green | Z2 | 3 | done 9 September 2026 |
| Z3 | The C# backend: hexagonal monolith, five modules, EF Core on SQLite by default with a PostgreSQL profile, Hot Chocolate, the security model, unit and integration tests, conformance green against schema 1.0, README walk through | Z2 | 12 | done 9 September 2026: eight projects with the domain free of any package or project reference, one class per use case, Hot Chocolate 16.6 with the Origin check as middleware, EF Core 10 on SQLite with moments stored as UTC ticks and a PostgreSQL context with its own migrations written and unrun, xunit v3 on the Microsoft Testing Platform, 173 tests, 33 of 33 scenarios against the host on port 8090, a README with every file and every request |
| Z4 | `docs/patterns.md` and `docs/security.md` written against the C# code with file paths | Z3 | 3 | done 9 September 2026: every path in the pattern table and the reading order checked against the tree (`Result` in the domain's shared kernel, the unit of work under `Application/Shared`, the cached repository under `Persistence/Catalogue`, the builders in the domain test project, the mutations in one `Mutation.cs`), stock reserved inside `Order.Place` with the event driving only the mail and the promotion counter, and a table in the security doc naming the file behind each rule |
| Z5 | The React Router frontend against the C# backend, end to end suite, README | Z3 | 8 | done 9 September 2026 against the mock server: 114 tests, lint, typecheck and build green, the four end to end journeys green (one without JavaScript), the C# backend still to be pointed at |
| Z6 | The Java backend, same modules, same tests, conformance green, README | Z2 | 10 | done 9 September 2026: four Maven modules, the domain and the application compiling with nothing on their classpath, 183 tests under `./mvnw clean verify`, 33 of 33 conformance scenarios against the host on port 8081, H2 in PostgreSQL mode by default with an unrun PostgreSQL profile, Testcontainers left out for want of Docker |
| Z7 | The Kotlin backend, same, README explaining what the language changes against Z6 | Z6 | 8 | done 9 September 2026: four Gradle modules on Gradle 9.5.0 and Kotlin 2.4.10, 129 tests under `./gradlew clean build`, 33 of 33 conformance scenarios against the host on port 8082, a README section on what the language changes against the Java backend, H2 in PostgreSQL mode by default with an unrun PostgreSQL profile, Testcontainers left out for want of Docker |
| Z8 | The Next.js frontend, end to end green, README | Z3 | 8 | done 9 September 2026 against the mock server: 70 tests, lint and build green, login and register as screens, the promotion code on the checkout, table rows for the cart lines, one complete document per screen because React's streamed markup stays hidden without JavaScript, a polite route announcer in place of the alert Next.js injects, all four shared end to end journeys green, the one without JavaScript included |
| Z9 | The Angular frontend, grown from the existing app: Angular 19.2 to 22, modules to standalone components, zoneless change detection, the JSON catalogue replaced by the contract, the wishlist kept and moved into the schema, end to end green, README | Z3 | 8 | done 9 September 2026 against the mock server: the six screens on `httpResource` and `resource` with Apollo for the writes, the JSON catalogue and the signal store for server data gone, login and register as screens behind a guard, the promotion code on the checkout, the open sessions region, a session marker cookie, 112 tests, lint and build green, the three shared end to end journeys green (the fourth is for server rendered fronts) |
| Z10 | A REST facet on the C# backend: a second inbound adapter over the same use cases, so the hexagon proves itself and H17 has its example | Z3 | 4 | open, needs decision 6 |
| Z11a | The Node backend as a federated graph: five subgraphs on Apollo Server with `@apollo/subgraph`, the composed supergraph on Apollo Router, the contract diff script, distributed authentication with a JWKS endpoint, conformance green against the router (`docs/federation.md`) | Z2 | 14 | done 9 September 2026: five subgraphs on Apollo Server 5 with `@apollo/subgraph`, the supergraph composed by `tools/compose.mjs` and served by `@apollo/gateway` because Norton blocks the router binary on the development laptop (`router/router.yaml` written for Apollo Router 2.16.3 and unrun), the contract diff script, JWKS verification with the session checked in every subgraph, `promotions` owning the totals, SQLite by default with an unverified PostgreSQL adapter, 162 tests, 33 of 33 scenarios through the gateway, the outbox written and not yet published (Z11b) |
| Z11b | The topics of the retail role in the federated backend, one named place and one proving test each: cache invalidation, the stock reservation saga, request against event driven, idempotency keys, retries with a budget, the outbox with at least once delivery, the circuit breaker and the degraded cart, DataLoader and query plans, one trace per request | Z11a | 12 | open |
| Z11c | Continuous integration for the graph: composition and contract checks that block a merge, one Compose file for the whole graph with the outbox poller and the telemetry collector | Z11b | 3 | open |
| Z12 | Continuous integration on GitHub Actions: build and test per project on every push, the conformance runner against each backend in a container, no deploy | Z3 | 3 | in progress since 9 September 2026: build and test per project on every push (Angular, Next.js, React Router, mock server, Java, Kotlin), the conformance runner against the built host inside all four backend workflows, the container form open |
| Z13 | The blog posts the family backs, one per project plus the two cross cutting ones (security, patterns), written under the depth rule and linked to the folders | per project | 3 each | open |

Order of work: Z1, Z2, Z3, Z4, Z5, then Z6 and Z8 in parallel, then Z7 and
Z9, then Z11a, Z11b and Z11c, then Z10, Z12, Z13. Z11a can start as soon as
Z2 is done if the Node backend should come before the JVM ones.

## 9. Repository layout

```
zappy-mart/
  README.md                the front door: what, why, the matrix, how to run
  BACKLOG.md               this file
  LICENSE                  MIT, pending decision 3
  docs/
    principles.md          the rules of section 2, written out
    domain.md              the store, its modules and rules
    contract.md            how the schema and the conformance suite work
    security.md            the two models, per frontend
    patterns.md            each pattern, its file, its problem
    versions.md            every pinned version with its date and source
  contract/
    schema.graphql         the one schema
    seed/                  the shared seed data
    operations/            one document per operation
    expected/              the answer each backend must give
  backends/
    dotnet/                Zappy.Domain, Zappy.Application, Zappy.Adapters.*, Zappy.Host, tests
    java/                  zappy-domain, zappy-application, zappy-adapters, zappy-host, tests
    kotlin/                the same modules in Kotlin
    node/                  the federated variant: subgraphs/{catalogue,cart,promotions,ordering,accounts}, router/, tools/
  frontends/
    react-router/
    nextjs/
    angular/
  tools/
    conformance/           the runner
    end-to-end/            the Playwright suite
```

Inside every backend the same four modules with the same names, so a
reader who knows one knows all three:

```
domain/          entities, value objects, domain events, the rules, no framework
application/     use cases, ports (repositories, clock, mailer), the result type
adapters/
  graphql/       the schema binding, resolvers or type extensions, the error mapping
  persistence/   the database mapping and the repositories
  security/      tokens, hashing, the session store
  mail/          the confirmation mail, a console implementation
host/            wiring, configuration, the entry point
tests/           unit, integration, conformance client
```

## 10. Decisions for Hilmar

1. **The name.** Resolved on 8 September 2026: Zappy Mart is the existing
   repository `hilmarvdveen/zappy-mart`, and the family lives in it.
2. **One repository or six.** Resolved with the same answer: one
   repository, one schema, one conformance suite, one README table.
3. **Licence.** MIT is the draft in the repository. It lets anyone reuse
   the code with attribution, which is what a tutorial wants.
4. **Database.** Amended on 9 September 2026: the development laptop
   has no Docker yet (it supports it, Windows 11 Home with WSL 2 and a
   hypervisor, the install is his call), so every backend runs and tests
   on an embedded database by default (SQLite on .NET and Node, H2 in
   PostgreSQL mode on the JVM) and carries a PostgreSQL 18 profile with a
   `compose.yaml`, verified once Docker is there. The tutorial reader gets
   a store that runs without Docker, and the PostgreSQL shape stays.
5. **A Node backend.** Resolved on 9 September 2026: yes, as the
   federated variant of `docs/federation.md`, GraphQL only on the client
   side, so that every topic of the retail role has a place in running
   code and the blog (H16, H19) has its Node server.
6. **A REST facet on the C# backend.** Two inbound adapters over one
   application layer is the clearest proof of the hexagon and gives H17 a
   running example. Four hours.
7. **Public from the first commit, or after Z3.** Public from day one
   shows the work in progress. After Z3 the first impression is a working
   store.
8. **The GitHub home.** Your personal account, or an organisation named
   after Hilmar ICT Services.

## 11. What is in the repository now

The existing Angular product listing page under `frontends/angular/`
(history preserved), and the skeleton of section 9 with this backlog,
the principles, the domain, the contract at version 0.1, the security
design, the pattern list, the version policy with the verified table
copied in, a README per project folder stating what it will hold, the
repository's own MIT licence, an `.editorconfig` and a `.gitignore`. One
local commit on top of the GitHub history, not pushed.
