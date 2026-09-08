# The conformance runner

Takes the url of a backend, resets the seed, runs the thirty three
scenarios in `contract/operations/` in order and compares each answer
with the file of the same name in `contract/expected/`. A backend is
finished when this run is green.

```
npm install
node run.mjs --url http://localhost:5000/graphql
```

It prints one line per scenario and a summary, and it exits non zero at
the first difference.

```
34 documents match contract/schema.graphql and contract/schema.development.graphql
seed loaded, 20 products
   1/33  catalogue-list                  matches
   2/33  catalogue-filter-by-category    matches
   ...
  33/33  mutation-without-origin         matches
33 of 33 scenarios matched contract/expected
```

A difference names the path, the value the contract asks for and the
value the backend gave, and nothing after it runs.

```
   8/33  promotion-apply-percentage      differs
      answer.data.applyPromotionCode.cart.promotion.discount.amount: a different value
        expected 239
        answered 238
7 of 33 scenarios matched, promotion-apply-percentage differs from contract/expected/promotion-apply-percentage.json
```

A request that cannot be sent at all stops the run the same way, under
the name of the scenario it belongs to, so a backend that never sets the
refresh cookie is a message and not a stack trace.

`--origin` sets the origin the requests carry. It defaults to
`http://localhost:5173`, the development origin of the React Router
frontend, and a backend allows it in its development profile.

## What the backend has to offer

- The schema of `contract/schema.graphql` at the url given.
- The `resetSeed` mutation of `contract/schema.development.graphql`, so
  the development profile and not production.
- The seed of `contract/seed/`, loaded whole. The run stops at the reset
  when `loadedProducts` is not twenty.
- A rate limit on login and register that lets the run through. It calls
  register twice and login five times, one of each on purpose refused.

## The four files

| File | Concern |
|---|---|
| `documents.mjs` | the contract folder: the schema, the scenario order, and every document with its variables and its expected answer. It fails when a document is in the folder and not in the order, or the other way round |
| `placeholders.mjs` | everything that differs per run: matching the `@` placeholders in an expected answer, the deep comparison that produces the differences, the `$` references a variables file uses, and the values the runner keeps from an answer to fill them |
| `client.mjs` | one request: the headers, the cookie jar, the origin, and reading the answer back into `data` and `errors` |
| `run.mjs` | the command line, the validation pass, the reset, the sequence, the printing and the exit code |

## The order of a run

1. Build the schema from `contract/schema.graphql` and
   `contract/schema.development.graphql`.
2. Validate all thirty four documents, the reset included, with
   graphql-js. Nothing is sent when one of them does not match the
   schema, so a typo in a document is a message and not a failed
   scenario.
3. Call `resetSeed` and check that it loaded twenty products.
4. Run the scenarios in the order of `contract/operations/README.md`,
   comparing each answer and stopping at the first difference.

## What the run carries from one scenario to the next

- **The access token.** Any answer with an `accessToken` sets the
  `Authorization: Bearer` header for every request after it. A `logout`
  that answers `success` throws the token and the refresh cookie away,
  the way a client does, so the scenarios after it are anonymous.
- **The cookies.** A jar follows `Set-Cookie`, drops a cookie that a
  header expires, and keeps the value `zappy_refresh` had before the
  last rotation. `refresh-session-replayed` sends that earlier value on
  purpose.
- **The origin.** Every request carries it except
  `mutation-without-origin`.
- **Three ids.** The id of the session marked `current`, the id of a
  session that is not, and the id of the order an answer put under
  `order`. A variables file writes them as `$sessionId`,
  `$otherSessionId` and `$orderId` and the runner fills them in, which is
  how `revoke-session` ends the login on the other device.

## The comparison

Deep equality that knows four placeholders, listed in
`contract/expected/README.md`. A missing field, an extra field, a list of
another length and a value that does not match its placeholder are all
differences, so a backend that answers more than the contract asks for
fails as loudly as one that answers less.

Two things are read leniently, because the GraphQL specification allows
both shapes: an answer with no `errors` key counts as an answer with no
errors, and an answer with no `data` key counts as `data: null`. A
GraphQL error is compared on its message alone, so `locations`, `path`
and `extensions` are the backend's own business.

## The tests

```
npm test
```

`node --test` runs the four test files. They cover every placeholder
kind, a wrong value, a missing field, an extra field, a document with a
field the schema does not have, the cookie jar and the whole sequence
against a fake `fetch` that replays the expected answers and checks the
headers, the cookies and the three ids on every request.
