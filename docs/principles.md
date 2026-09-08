# Principles

These rules apply to every project in this repository, in every language.
They exist so a reader can move from one project to the next and find
the same shape, the same names and the same reasoning.

## Readability comes first

DRY and SOLID are tools for readable code that is easy to change. They
are not goals. Two tests decide whether an abstraction stays:

1. Does the code get easier to follow with it? An interface with one
   implementation that is not a port of the hexagon usually makes it
   harder, and goes.
2. Would a change have to be made in more than one place without it? If
   the same business rule is written in two places, the duplication goes.
   If two pieces of code merely look alike and change for different
   reasons, they stay apart.

The tie breaker is the reader who opens the file for the first time.

## Duplication across languages is expected

Each backend is a complete tutorial on its own. The C# store and the Java
store contain the same rules written twice, on purpose. Inside one backend
every rule has exactly one home.

## Names carry the meaning, documents carry the reasoning

- No abbreviations in identifiers. `quantity`, `customer`, `promotionCode`,
  `repository`. The accepted short names are `id`, `url`, and the idioms
  of the language itself (`args` in a GraphQL resolver signature, `it` in
  a Kotlin lambda is not used, a named parameter is).
- No comments in code. If a line needs a comment, the name or the
  structure is wrong. The reasoning behind a decision goes in the
  markdown next to the code, and the walk through in the README.
- One concept, one word, everywhere: a `Customer` is never also a `User`,
  a `PromotionCode` is never also a `Coupon`.

## The hexagon is the shape

The domain sits in the middle and imports no framework. Use cases sit
around it and depend on ports (interfaces) for everything outside:
repositories, a clock, a mailer, a token issuer. Adapters implement the
ports on the outside: GraphQL in, the database out, mail out.

The test for the shape is mechanical: the domain module compiles without
the web and database packages, and a use case has a unit test with no
database behind it.

## One monolith, five modules

Catalogue, Cart, Promotions, Ordering, Accounts. A module owns its tables
and its rules. Modules talk through use cases and domain events, never
through each other's tables or entities. That is what keeps a monolith
from becoming one big class, and it is what would let a module leave the
monolith one day without a rewrite.

## Patterns where they pay

A pattern is used where it solves a problem the reader can see, and
`patterns.md` names the file and the problem. A pattern with no problem is
not used. The list of what was left out, and why, is as important as the
list of what is in.

## Every project is a tutorial

The README of every project goes from an empty folder to a running
application: the create commands, every file with its path and its
complete content, the run command, one request per operation with the
response it returns, the failure responses, the test command and what a
passing run prints. No step skipped, nothing explained twice.

## Tests are the second reader

- Domain rules have unit tests that read like the rule.
- Adapters have integration tests against a real database in a container.
- Every backend passes the shared conformance suite in `contract/`.
- Every frontend passes the shared end to end suite in `tools/end-to-end/`.

## Security is built in

The model in `security.md` is the same for every backend. Passwords are
hashed with Argon2id, access tokens are short lived JWTs, refresh tokens
rotate and live in httpOnly cookies backed by a session table, cookie
authenticated mutations check the origin, login is rate limited, and no
secret ever reaches a log line.

## Versions are pinned and dated

`versions.md` is the one place. Every project runs the version listed
there, and the blog cites that version.

## Style in prose

The same rules as the site: no dash as a sentence connector, no semicolon
joining sentences, short sentences, Dutch written as Dutch where a project
carries Dutch copy.
