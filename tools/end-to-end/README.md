# The end to end suite

One Playwright suite that drives a running Zappy Mart store front through
the browser. It is written once and runs against every frontend, because
it finds everything by role and by visible text and never by a class name
or a test identifier. The frontend under test is named by the environment
variable `FRONTEND_URL`.

Item Z5 in `../../BACKLOG.md`. It ran first against
`frontends/react-router` and runs against `frontends/nextjs` and
`frontends/angular` when those exist.

## What it checks

| File | What it drives |
|---|---|
| `tests/storeFrontIsUp.spec.ts` | The catalogue answers with products, a filter and the shop chrome. This is the smoke test to run when nothing else can run yet. |
| `tests/catalogueToPlacedOrder.spec.ts` | The buying journey: filter the catalogue, open a product, fill the cart, change a quantity, log in at the checkout gate, apply the promotion code `WELCOME10`, place the order and read the confirmation. |
| `tests/sessionsAndReplay.spec.ts` | The account journey: register, log out, log in, open a second browser, see two sessions, revoke the other one, watch that browser get signed out, and then present a dead session cookie again and watch the store refuse it. |
| `tests/withoutJavaScript.spec.ts` | The same catalogue filter and the same cart forms with JavaScript switched off. Tagged `@progressive-enhancement`, because only a server rendered frontend can pass it. |

The two journeys the backlog asks for are `catalogueToPlacedOrder` and
`sessionsAndReplay`.

## What it needs

Two things running, and it starts neither of them, so the same suite can
point at a development server, a built server or a container.

1. A Zappy Mart API. The mock server in `../mock-server` serves the whole
   contract from `../../contract/`.
2. A store front against that API.

## Installing

```
cd tools/end-to-end
npm install
npx playwright install chromium
```

Node 24 or newer. The versions are pinned in `package.json`:
`@playwright/test` 1.63.0, `typescript` 6.0.3, `@types/node` 24.13.3.

## Running it

Three terminals. First the API:

```
cd tools/mock-server
node server.mjs
```

Then the store front, pointed at that API:

```
cd frontends/react-router
npm run build
PORT=5173 SESSION_SECRET=a-long-random-string npm run start
```

Then the suite:

```
cd tools/end-to-end
npm test
```

A passing run prints one line per test and one summary line:

```
Running 4 tests using 1 worker

  ok 1 [chromium] › tests\catalogueToPlacedOrder.spec.ts:13:1 › a visitor filters the catalogue, fills a cart, uses a promotion code and places an order (1.9s)
  ok 2 [chromium] › tests\sessionsAndReplay.spec.ts:25:1 › a customer registers, logs in twice, revokes the other session and cannot replay a dead one (2.9s)
  ok 3 [chromium] › tests\storeFrontIsUp.spec.ts:4:1 › the catalogue answers with products, a filter and the shop chrome (413ms)
  ok 4 [chromium] › tests\withoutJavaScript.spec.ts:6:1 › the catalogue filter and the cart forms work without JavaScript @progressive-enhancement (1.2s)

  4 passed (8.8s)
```

Only the smoke test:

```
npm run test:smoke
```

## The settings

| Variable | Default | What it does |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:5173` | The store front the suite drives. Point it at the Next.js or the Angular store front to run the same suite there. |
| `GRAPHQL_URL` | `http://localhost:4000/graphql` | The API, used only for `resetSeed`. The suite itself never queries the API. |
| `RESET_SEED` | not set | Set it to `true` to reload the seed once before the run, so a run starts from known stock and known promotion codes. It calls `resetSeed`, which a backend serves only in its development profile. |
| `CI` | not set | Set it to `true` to forbid `test.only` and to retry a failed test once. |

The suite runs one worker and no parallelism, because the store behind it
holds one stock count that every journey draws from.

## Running it against another frontend

```
FRONTEND_URL=http://localhost:3001 npm test
```

A single page application cannot pass the progressive enhancement test,
so leave it out there:

```
FRONTEND_URL=http://localhost:4200 npx playwright test --grep-invert "@progressive-enhancement"
```

## How it stays portable

- Every element is found by its role and its accessible name. A frontend
  that renders a heading, a search box, a table row and a button with the
  same names passes without a change here.
- The money and the totals come from `../../contract/seed/`, so the
  amounts the tests expect hold for every backend that loads that seed.
  Two products carry rules the seed fixes: `product-07` has no stock and
  `product-12` has one left.
- The buying journey orders two of `product-18` at 985 cents each. That
  is a subtotal of 1970, shipping of 495 because the subtotal stays under
  5000, and `WELCOME10` takes 197 off, for a total of 2268. The worked
  example is in `../../contract/seed/seed.md`.
- The account journey registers a new customer with a fresh email address
  every run, so it never depends on what an earlier run left behind.

## The names the store front has to use

These are the accessible names the suite looks for. A frontend that wants
to pass writes these words.

| Screen | Role and name |
|---|---|
| Every screen | link `Cart, <count> items` (`Cart, 1 item` for one, the suite never asserts that count), link or button `Wishlist, <count> saved` (a button where the wishlist opens as a drawer), link `Log in` or button `Log out` |
| Catalogue | heading level 1 `Catalogue`, searchbox `Search by name`, combobox `Category`, checkbox `In stock only`, button `Filter` |
| Product | heading level 1 with the product name, spinbutton `Quantity`, button `Add to cart`, status with `Added to your cart.` |
| Cart | heading level 1 `Cart`, one row per line with the product name, spinbutton in that row, button `Update`, button `Remove <product name>` |
| Checkout | heading level 1 `Checkout`, textbox `Promotion code`, button `Apply code`, button `Place order` |
| Order confirmation | heading level 1 `Thank you for your order` |
| Account | heading level 1 `Your account`, region `Open sessions` with one list item per session, `(this device)` on the current one, button `Revoke <device>` |
| Log in | heading level 1 `Log in`, textbox `Email address`, textbox `Password`, button `Log in`, alert `Your session has ended. Please log in again.` |
| Register | heading level 1 `Register`, textbox `Name`, textbox `Email address`, textbox `Password`, button `Register` |

## What it does not do

It does not start a server, it does not read a database, and it does not
call the API except for the optional seed reset. Everything else happens
through the browser, the way a customer would do it.
