# Zappy Mart

One small web store, built several times over, so that every article on
[hilmarvanderveen.com](https://www.hilmarvanderveen.com) has a working
application behind it that you can read end to end and build yourself.

The store is the same in every version: a catalogue, a cart, a checkout,
customer accounts with secure sessions, and promotion codes. One GraphQL
schema in `contract/` is served by every backend and consumed by every
frontend, so any frontend runs against any backend.

| | C# on .NET 10 | Java 25 on Spring Boot 4.1 | Kotlin 2.4 on Spring Boot 4.1 |
|---|---|---|---|
| **React Router 8** | | | |
| **Next.js 16** | | | |
| **Angular 22** | | | |

Every cell is the same store. The backends are hexagonal monoliths with
five modules (catalogue, cart, promotions, ordering, accounts), the
frontends share one set of screens and one end to end suite.

Nothing here is deployed. The value is the code, the tests, and the walk
through in every project's README that goes from an empty folder to a
running application.

## Where to start

- `BACKLOG.md`: what gets built, in which order, and the decisions behind it.
- `docs/principles.md`: the rules every project follows.
- `docs/domain.md`: the store and its rules.
- `contract/schema.graphql`: the one schema.
- `docs/security.md`: sessions and JWT, the model every project shares.
- `docs/patterns.md`: the design patterns, each with the problem it solves.
- `docs/versions.md`: every version, pinned and dated.

## Where it started

The repository began in April 2025 as an Angular product listing page
with a persistent wishlist, a side drawer and a JSON catalogue. That
application lives on in `frontends/angular/` and is the starting point
of the Angular store front: it moves to the current Angular release,
standalone components and the shared contract, and keeps its wishlist.

## Status

9 September 2026: the contract at version 1.0 with its seed, 33
conformance scenarios and the runner in `tools/conformance`, a mock
server in `tools/mock-server` that passes all 33, the Angular product
listing page upgraded to Angular 22, and the federation design for the
Node backend. The three monoliths, the federated graph and the three
store fronts are being built. The three store fronts are done against the mock server, with the shared end to end suite in `tools/end-to-end`, which the Next.js and Angular fronts are being aligned to.

## Licence

MIT, see `LICENSE`.
