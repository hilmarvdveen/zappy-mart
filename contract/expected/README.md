# Expected answers

One file per scenario in `../operations/`, under the same name: the whole
answer a backend has to give, computed by hand from `../seed/` and the
rules in `docs/domain.md`. A number in here that does not follow from the
seed is a bug in the contract, so the cart the scenarios build is worked
out in `../operations/README.md`.

Each file holds the two keys of a GraphQL answer:

- `data`, the answer itself, or null when the request was refused before
  it ran.
- `errors`, the GraphQL errors, an empty list for every scenario except
  `mutation-without-origin`. A backend that leaves the key out of a
  successful answer, as the specification asks, still matches: the runner
  reads a missing `errors` as an empty list and a missing `data` as null.

The errors a rule causes are a different thing. They sit inside `data`,
in the `errors` list of the payload, and they carry a `code` from
`UserErrorCode` and the `field` the code belongs to. The runner does not
compare the `message` of a `UserError`, because that sentence is each
backend's own and a client switches on the code.

## The placeholders

Where a value is made at run time, the expected answer carries a
placeholder and the runner accepts any value of that shape.

| Placeholder | Matches |
|---|---|
| `@id` | a non-empty string the backend chooses: an id, an order number, a session id, and the text of the one GraphQL error in `mutation-without-origin` |
| `@dateTime` | an ISO 8601 moment in UTC with second precision, for example `2026-09-09T14:30:00Z` |
| `@token` | an access token: a JSON Web Token of three non-empty parts separated by dots, as `docs/security.md` describes |
| `@cursor` | a non-empty pagination cursor |

Everything else is compared exactly, including the values the seed fixes:
`customer-01` and `2026-01-15T09:00:00Z` for the seed customer, and
`product-01` to `product-20` with their names, prices and stock.
