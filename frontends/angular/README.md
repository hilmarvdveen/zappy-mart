# The Angular store front

Zappy Mart is one small web store built several times over, so that a reader can open a
working application for every stack the articles explain, read it end to end, and build
it themselves. This folder is the Angular version: a single page application with
standalone components, signals, zoneless change detection and `OnPush` everywhere, which
reads and writes the shared GraphQL contract in `contract/schema.graphql`.

This README is the walk through. It starts at the product listing page this folder held
in April 2025, and it ends at a store with six screens, an account, a cart that survives
a reload, a checkout and an order history. Every file it adds is here with its path and
its complete content.

## Where it started and where it ends

The application that was here before had one page, one JSON file of twenty products in
`src/assets/products.json`, a wishlist in local storage, and a drawer to look at it. It
had 37 tests. Item Z9 of `BACKLOG.md` grows it into the store front of section 7.

| Before | Now |
|---|---|
| one page with a product list | six screens: catalogue, product, cart, checkout, order confirmation, account |
| `src/assets/products.json` read over HTTP | `contract/schema.graphql` served by an API |
| a wishlist in local storage | a wishlist on the server, anonymous through the `zappy_cart` cookie and merged into the customer on login |
| `ProductSignalStoreService`, a store for server data | `resource` and `httpResource`, which are the cache |
| no account, no cart, no orders | registration, login, sessions a customer can revoke, a cart, promotion codes and a placed order |
| copy in Dutch, one route in Dutch (`/over-ons`) | copy in English throughout, the about page at `/about` |

The two spec files that only existed to prove the JSON catalogue was read are gone with
the JSON: `product-api.service.spec.ts` and `product-signal-store.service.spec.ts`,
together with the `Product` model they typed, eight tests in all. Every other test was
kept and moved with its subject, and the count went from 37 to 112.

## Running it

Node.js `^22.22.3 || ^24.15.0 || ^26.0.0`, which is what Angular 22 supports. This
machine runs Node 24.20.0.

The store front talks to a GraphQL API on `http://localhost:4000/graphql`. Until a
backend exists, the mock server in `tools/mock-server/` serves the whole contract from
the shared seed:

```bash
cd tools/mock-server
npm install
node server.mjs
```

Then, in a second terminal:

```bash
cd frontends/angular
npm install
npm start
```

Open http://localhost:4200. The catalogue shows the twenty products of
`contract/seed/products.json` in catalogue order. The mock server allows the origin
`http://localhost:4200` on mutations, which is the origin check of `docs/security.md`.
The browser sets that `Origin` header itself on every cross origin request, and no
script can set it, so the frontend's part is to send the cookies with the request.

The endpoint is not compiled in. `src/environments/environment.ts` holds it, and the
production build replaces that file with `environment.production.ts`, which points at
`/graphql` on the frontend's own origin. When a backend from `backends/` is ready, the
endpoint changes and nothing else does.

## The six screens

| Route | Screen | What it does |
|---|---|---|
| `/` | catalogue | The whole catalogue, paged. The category filter and the search term live in the url as `?category=` and `?search=`, so a filtered catalogue is a link a visitor can share and a back button walks through the filters. Every card adds to the cart and saves to the wishlist. |
| `/product/:slug` | product | One product by its slug, with the description, the price, the stock and a quantity to add. A refusal is shown as the contract sends it, so a quantity above the stock says how many are left. |
| `/cart` | cart | The lines, each a small form with a quantity and an Update button, a button to remove the line, and the amounts of the contract: subtotal, the promotion when one applies, shipping and total. |
| `/checkout` | checkout | The order to be placed, the promotion code to apply, and the button that places it. An order belongs to a customer, so `signedInGuard` sends an anonymous visitor to `/login?returnTo=/checkout` and back again. Placing the order sends one idempotency key that survives a reload, so a retry after a lost answer places no second order. |
| `/orders/:orderId` | order confirmation | The placed order with its number, its status, the names and prices of the moment, and the totals it was paid at. |
| `/account` | account | The customer, the order history and an Open sessions panel with one entry per session, the current one marked and every other one revocable. It is behind `signedInGuard`, so a visitor without a session lands on `/login`. |

Three more routes carry the rest: `/login` and `/register` are the two authentication
screens, `/about` is the about page, and anything else redirects to the catalogue.

## The shape of the data layer

Three sentences hold the whole design.

**Reads are resources.** A screen declares what it needs as a `resource`, and Angular
runs it, re-runs it when its request changes and exposes the answer, the loading flag and
the failure as signals. `httpResource` is the specialisation for a read that is one HTTP
request, which is every query in this store, and `graphqlResource` in
`src/app/api/graphql-resource.ts` is the one place that turns a typed document into one.
`resource` itself is used once, for the wishlist, because that read goes through the
Apollo client rather than straight over HTTP.

**Writes are Apollo.** Every mutation goes through `apollo.mutate` with the generated
document. The answer of a cart mutation carries the whole cart, exactly as
`CartPayload` in the contract promises, so the cart resource takes the answer with
`set` and no second request is made.

**Client state is a signal, and server data has no store.** The drawer is open or it is
not, and that is a `signal` in `WishlistDrawerService`. The access token is held in
memory, and that is a `signal` in `AccessTokenStore`. Everything else belongs to the
server, and it has no store at all.

### Why there is no store for server data

The application that was here before had one: `ProductSignalStoreService` held the
products, a loading flag, an error, a loaded flag, and an effect that called `load` when
the products changed. Five pieces of state, one of which existed only to stop the effect
looping. Every one of them is a copy of something the server already knows, and every
copy has to be told when the original changes.

A resource is that store, written once by the framework. It holds the value, the loading
flag and the error, it cancels a request that is no longer wanted, and it re-runs itself
when its request changes. What is left for the application to write is the request:

```ts
private readonly catalogue = graphqlResource(CatalogueDocument, () => ({
  filter: {
    categorySlug: this.category() === '' ? null : this.category(),
    nameContains: this.search() === '' ? null : this.search(),
  },
  first: this.pageSize(),
}));
```

`category` and `search` are signal inputs bound from the url, and `pageSize` is a signal
the "Show more products" button raises. Nothing subscribes, nothing unsubscribes and
nothing has to remember to reload. The url is the state, and the catalogue follows it.

The one thing a resource cannot do on its own is know that the answer is different for a
different visitor. `graphqlResource` puts the access token in the request it builds, so
a read of the cart, the wishlist, the customer or the order history is a read *for one
visitor*: when the token changes the request changes, and every screen reads again.
Logging in and logging out therefore refresh the whole application without a line of
wiring. The interceptor still owns what is sent, and it replaces the token on the request
it sends again after a refresh.

This frontend is the running example of the article the blog carries as H18.

## Security in the browser

`docs/security.md` gives the Angular frontend one shape: a single page application that
calls the API directly, with the access token in memory only.

- **The access token lives in `AccessTokenStore`**, a signal and nothing else. It is not
  in local storage, not in a cookie the page can read, and it is gone on a reload. That
  is the point: a script that runs in this page has nothing to steal from a store that
  outlives the page.
- **The refresh token never touches the application.** It is in the `zappy_refresh`
  cookie the API sets, httpOnly and Secure, with its path limited to the endpoint. The
  frontend's whole part is `withCredentials: true`, which the interceptor puts on every
  request to the API.
- **A reload restores the session.** `provideAppInitializer` runs one `refreshSession`
  before the first screen renders, so a visitor who reloads is still logged in and the
  first cart read already carries the new token. It runs only when the `zappy_session`
  marker says this browser has a session open, so a first visit pays nothing for it.
- **The interceptor refreshes twice over.** Before it sends a token that is within half a
  minute of its expiry, and again when the API answers 401. Both go through
  `SessionRefresher`, which keeps one refresh in flight at a time, so ten screens that
  wake up together do not rotate the refresh token ten times and revoke the family.
- **The anonymous cart and the anonymous wishlist follow the `zappy_cart` cookie.** They
  move to the customer on login, and the server does the moving.
- **Logging out ends the session at once.** The backends check the session on every
  request, so the access token the application throws away is dead the moment `logout`
  answers.

## The contract and the generated types

`contract/schema.graphql` is the single source. The operations this frontend sends live
in `src/app/api/operations/` as plain `.graphql` documents, and one command turns the
schema and those documents into typed documents:

```bash
npm run generate
```

It writes `src/app/api/generated/contract.ts`: one `TypedDocumentNode` per operation and
one TypeScript type per result, per set of variables and per fragment. That file is
generated, it is committed, and it is the only file in `src/` that is not written by
hand. It is out of the lint run and out of Prettier, and the workflow in
`.github/workflows/angular.yml` runs the command and fails when the committed file and
the schema have drifted apart.

Nothing in the application declares the shape of an answer. `CartDetailFragment`,
`OrderDetailFragment` and `ProductSummaryFragment` come from the schema, and the two
types the application does name are derived from them:

```ts
export type Money = ProductSummaryFragment['price'];
export type UserError = AuthenticationFragment['errors'][number];
```

A field that leaves the schema is a compile error here, which is the whole reason the
contract is a file and not a document.

`UserErrorCode` is generated as a union of the nineteen string values, so
`userErrorMessage` is a `Record<UserErrorCode, string>` and a new code in the schema is a
compile error until this frontend has a sentence for it.

## The layout

```
frontends/angular/
  codegen.ts                          the code generation configuration
  src/
    environments/                     the GraphQL endpoint, one file per configuration
    app/
      api/                            everything that talks to the store API
        operations/                   the GraphQL documents this frontend sends
        generated/contract.ts         the typed documents and types, written by npm run generate
      catalogue/                      the catalogue screen
      product/                        the product screen
      cart/                           the cart screen and the cart service
      checkout/                       the checkout screen, the order service and the attempt key
      order-confirmation/             the order confirmation screen
      account/                        the account screen and the session service
      about/                          the about page
      login/, register/               the two authentication screens
      header/                         the top bar
      wishlist-drawer/                the drawer and its open or closed signal
      app.component.*                 the shell: the header, the outlet and the drawer
      app.config.ts                   the providers
      app.routes.ts                   the route table
    shared/
      components/                     the product card, the product image, the login form, the errors
      services/                       local storage and the wishlist
      money.ts, money.pipe.ts         one currency format in one place
      input-value.ts                  reading a value out of an input event
    testing/roles.ts                  the role queries the screen tests use
  public/images/products/             the placeholder drawing
```

## The configuration

Five files changed and one is new.

### `codegen.ts`

New. It reads the schema two folders up and the documents beside the application, and writes one file. `skipTypename` keeps `__typename` out of the types, because Apollo adds the field to the wire document itself and nothing in the application reads it. `enumsAsTypes` makes every enum a union of string literals, so `error.code === 'OUT_OF_STOCK'` is a comparison and not an import. `strictScalars` refuses to guess: `DateTime` is mapped to `string` and a new scalar in the contract stops the generation until this file names it.

```ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const configuration: CodegenConfig = {
  schema: '../../contract/schema.graphql',
  documents: ['src/app/api/operations/*.graphql'],
  ignoreNoDocuments: false,
  generates: {
    'src/app/api/generated/contract.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        skipTypename: true,
        enumsAsTypes: true,
        dedupeFragments: true,
        strictScalars: true,
        avoidOptionals: { field: true },
        scalars: { DateTime: 'string' },
      },
    },
  },
};

export default configuration;
```

### `package.json`

The four runtime packages, the three generation packages and the `generate` script. `lint:fix` lost the `--ext` flag, which ESLint 10 does not accept.

```json
{
  "name": "zappy-mart-frontend",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "generate": "graphql-codegen --config codegen.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "format": "prettier --write \"src/**/*.{ts,html,scss,css,js,json,md}\"",
    "lint": "ng lint",
    "lint:fix": "eslint . --fix"
  },
  "private": true,
  "dependencies": {
    "@angular/common": "^22.1.5",
    "@angular/compiler": "^22.1.5",
    "@angular/core": "^22.1.5",
    "@angular/platform-browser": "^22.1.5",
    "@angular/router": "^22.1.5",
    "@apollo/client": "4.2.12",
    "@graphql-typed-document-node/core": "3.2.0",
    "apollo-angular": "14.2.0",
    "graphql": "17.0.2",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0"
  },
  "devDependencies": {
    "@angular/build": "^22.1.7",
    "@angular/cli": "^22.1.7",
    "@angular/compiler-cli": "^22.1.5",
    "@eslint/js": "^10.0.1",
    "@graphql-codegen/cli": "7.4.0",
    "@graphql-codegen/typed-document-node": "7.1.0",
    "@graphql-codegen/typescript-operations": "6.1.6",
    "@types/jest": "^30.0.0",
    "angular-eslint": "22.5.0",
    "eslint": "^10.10.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.6",
    "jest": "^30.5.1",
    "jest-environment-jsdom": "^30.5.1",
    "jest-preset-angular": "^17.0.0",
    "prettier": "^3.9.6",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.33.1"
  }
}
```

### `angular.json`

Two changes. The production configuration replaces the environment file, which is how the endpoint differs between development and production. The initial bundle warning went from 500kB to 750kB, because the GraphQL client and the GraphQL parser are part of the store front and the bundle is 503kB raw and 121kB over the wire.

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "zappy-mart-frontend": {
      "projectType": "application",
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "outputPath": "dist/zappy-mart-frontend",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              },
              {
                "glob": "**/*",
                "input": "src/assets",
                "output": "assets"
              }
            ],
            "styles": [
              "src/styles.scss"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "750kB",
                  "maximumError": "1MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "4kB",
                  "maximumError": "8kB"
                }
              ],
              "outputHashing": "all",
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.production.ts"
                }
              ]
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular/build:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "zappy-mart-frontend:build:production"
            },
            "development": {
              "buildTarget": "zappy-mart-frontend:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular/build:extract-i18n"
        },
        "lint": {
          "builder": "@angular-eslint/builder:lint",
          "options": {
            "lintFilePatterns": [
              "src/**/*.ts",
              "src/**/*.html"
            ]
          }
        }
      }
    }
  },
  "cli": {
    "schematicCollections": [
      "angular-eslint"
    ]
  },
  "schematics": {
    "@schematics/angular:component": {
      "type": "component"
    },
    "@schematics/angular:directive": {
      "type": "directive"
    },
    "@schematics/angular:service": {
      "type": "service"
    },
    "@schematics/angular:guard": {
      "typeSeparator": "."
    },
    "@schematics/angular:interceptor": {
      "typeSeparator": "."
    },
    "@schematics/angular:module": {
      "typeSeparator": "."
    },
    "@schematics/angular:pipe": {
      "typeSeparator": "."
    },
    "@schematics/angular:resolver": {
      "typeSeparator": "."
    }
  }
}
```

### `jest.config.js`

`fakeTimers: { enableGlobally: true }` is gone. Zoneless change detection settles on a real task, so `fixture.whenStable()` never resolves while the timers are faked.

```js
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  moduleDirectories: ['node_modules', 'src'],
};
```

### `eslint.config.js`

The generated folder is ignored. Everything else in `src` is linted as before.

```js
// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
module.exports = tseslint.config(
  {
    ignores: ['src/app/api/generated/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  }
);
```

### `.prettierignore`

The generated folder again, so a format run does not rewrite what the generator wrote.

```
dist
node_modules
coverage
package-lock.json
src/app/api/generated
```

### `.github/workflows/angular.yml`

The workflow now watches the schema as well, runs the generation and fails when the committed types and the schema have drifted apart. The three gate commands are unchanged.

```yaml
name: Angular frontend

on:
  push:
    branches: [main]
    paths:
      - "frontends/angular/**"
      - "contract/schema.graphql"
      - ".github/workflows/angular.yml"
  pull_request:
    paths:
      - "frontends/angular/**"
      - "contract/schema.graphql"
      - ".github/workflows/angular.yml"

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontends/angular
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: frontends/angular/package-lock.json
      - run: npm ci
      - run: npm run generate
      - name: The generated types match contract/schema.graphql
        run: git diff --exit-code -- src/app/api/generated
      - run: npm run lint
      - run: npm test -- --ci
      - run: npm run build
```

## The endpoint

### `src/environments/environment.ts`

The mock server during development.

```ts
export const environment = {
  graphqlUrl: 'http://localhost:4000/graphql',
};
```

### `src/environments/environment.production.ts`

The same origin as the frontend in production, so a reverse proxy in front of both needs no cross origin rules at all.

```ts
export const environment = {
  graphqlUrl: '/graphql',
};
```

## The operations

Four documents, one per module of `docs/domain.md` that this frontend touches. Fragments are shared across the files, so `ProductSummary` is written once and the catalogue, the product page, the cart and the wishlist all select it.

### `src/app/api/operations/catalogue.graphql`

The catalogue asks for the categories and a page of products in one round trip, because the screen needs both to render once.

```graphql
fragment ProductSummary on Product {
  id
  name
  slug
  price {
    amount
    currency
  }
  stock
  imageUrl
  category {
    id
    name
    slug
  }
}

query Catalogue($filter: ProductFilter, $first: Int, $after: String) {
  categories {
    id
    name
    slug
  }
  products(filter: $filter, first: $first, after: $after) {
    totalCount
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        ...ProductSummary
      }
    }
  }
}

query ProductBySlug($slug: String!) {
  product(slug: $slug) {
    ...ProductSummary
    description
  }
}
```

### `src/app/api/operations/cart.graphql`

One `CartDetail` fragment and one `CartChange` fragment, so every cart mutation answers in the shape the cart query answers in and the screen renders the new state without a follow up query.

```graphql
fragment CartDetail on Cart {
  id
  updatedAt
  promotion {
    code
    kind
    discount {
      amount
      currency
    }
  }
  subtotal {
    amount
    currency
  }
  shipping {
    amount
    currency
  }
  total {
    amount
    currency
  }
  lines {
    id
    quantity
    lineTotal {
      amount
      currency
    }
    product {
      ...ProductSummary
    }
  }
}

fragment CartChange on CartPayload {
  cart {
    ...CartDetail
  }
  availableStock
  errors {
    code
    message
    field
  }
}

query Cart {
  cart {
    ...CartDetail
  }
}

mutation AddToCart($productId: ID!, $quantity: Int) {
  addToCart(productId: $productId, quantity: $quantity) {
    ...CartChange
  }
}

mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {
  changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {
    ...CartChange
  }
}

mutation RemoveCartLine($lineId: ID!) {
  removeCartLine(lineId: $lineId) {
    ...CartChange
  }
}

mutation ApplyPromotionCode($code: String!) {
  applyPromotionCode(code: $code) {
    ...CartChange
  }
}

mutation RemovePromotionCode {
  removePromotionCode {
    ...CartChange
  }
}
```

### `src/app/api/operations/account.graphql`

Registration, login, refresh, logout, revoking a session and the two wishlist mutations. `Authentication` is one fragment across `register`, `login` and `refreshSession`, because the contract answers all three with the same payload.

```graphql
fragment SessionDetail on Session {
  id
  device
  createdAt
  lastUsedAt
  current
}

fragment CustomerDetail on Customer {
  id
  email
  name
  createdAt
  sessions {
    ...SessionDetail
  }
}

fragment Authentication on AuthenticationPayload {
  customer {
    ...CustomerDetail
  }
  accessToken
  accessTokenExpiresAt
  errors {
    code
    message
    field
  }
}

query CurrentCustomer {
  me {
    ...CustomerDetail
  }
}

query Wishlist {
  wishlist {
    ...ProductSummary
  }
}

mutation Register($input: RegisterInput!) {
  register(input: $input) {
    ...Authentication
  }
}

mutation Login($input: LoginInput!) {
  login(input: $input) {
    ...Authentication
  }
}

mutation RefreshSession {
  refreshSession {
    ...Authentication
  }
}

mutation Logout {
  logout {
    success
    errors {
      code
      message
      field
    }
  }
}

mutation RevokeSession($sessionId: ID!) {
  revokeSession(sessionId: $sessionId) {
    sessions {
      ...SessionDetail
    }
    errors {
      code
      message
      field
    }
  }
}

mutation AddToWishlist($productId: ID!) {
  addToWishlist(productId: $productId) {
    products {
      ...ProductSummary
    }
    errors {
      code
      message
      field
    }
  }
}

mutation RemoveFromWishlist($productId: ID!) {
  removeFromWishlist(productId: $productId) {
    products {
      ...ProductSummary
    }
    errors {
      code
      message
      field
    }
  }
}
```

### `src/app/api/operations/ordering.graphql`

The order history, one order and placing an order.

```graphql
fragment OrderDetail on Order {
  id
  number
  status
  placedAt
  promotionCode
  subtotal {
    amount
    currency
  }
  discount {
    amount
    currency
  }
  shipping {
    amount
    currency
  }
  total {
    amount
    currency
  }
  lines {
    productName
    quantity
    unitPrice {
      amount
      currency
    }
    lineTotal {
      amount
      currency
    }
  }
}

query Orders($first: Int, $after: String) {
  orders(first: $first, after: $after) {
    totalCount
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        ...OrderDetail
      }
    }
  }
}

query OrderById($id: ID!) {
  order(id: $id) {
    ...OrderDetail
  }
}

mutation PlaceOrder($idempotencyKey: String) {
  placeOrder(idempotencyKey: $idempotencyKey) {
    order {
      ...OrderDetail
    }
    errors {
      code
      message
      field
    }
  }
}
```

`src/app/api/generated/contract.ts` is what `npm run generate` writes from these four files and the schema. It is 374 lines of generated code and it is not printed here, because printing generated output in a tutorial teaches the reader to read it rather than to run the command. The command is above and the configuration is `codegen.ts`.

## The store API layer

### `src/app/api/graphql-url.ts`

The endpoint as an injection token rather than an import, so a test provides its own address and never depends on the environment file.

```ts
import { InjectionToken } from '@angular/core';

export const GRAPHQL_URL = new InjectionToken<string>('GRAPHQL_URL');
```

### `src/app/api/graphql-answer.ts`

The envelope every GraphQL answer arrives in, and the one place that decides what a failure is. An `errors` list here is a GraphQL error, which means the request was wrong or the transport refused it. It is not a `UserError`, which is data a screen renders.

```ts
export interface GraphqlAnswer<TData> {
  data?: TData | null;
  errors?: { message: string }[];
}

export function readGraphqlData<TData>(answer: unknown): TData {
  const received = answer as GraphqlAnswer<TData>;

  if (received.errors !== undefined && received.errors.length > 0) {
    throw new Error(received.errors.map((failure) => failure.message).join(' '));
  }

  if (received.data === undefined || received.data === null) {
    throw new Error('The store API answered without data.');
  }

  return received.data;
}
```

### `src/app/api/access-token-header.ts`

How the token is spelled on the wire, in one place, used by the read helper, the Apollo link and the interceptor.

```ts
export function accessTokenHeader(token: string | null): Record<string, string> {
  return token === null ? {} : { Authorization: `Bearer ${token}` };
}
```

### `src/app/api/access-token-store.ts`

The access token and its expiry, in memory. `aboutToExpire` gives the interceptor half a minute of margin, so a token is exchanged before a request fails rather than after.

```ts
import { computed, Injectable, signal } from '@angular/core';

const refreshMarginInMilliseconds = 30_000;

@Injectable({ providedIn: 'root' })
export class AccessTokenStore {
  private readonly currentToken = signal<string | null>(null);
  private readonly currentExpiry = signal<number | null>(null);

  readonly token = this.currentToken.asReadonly();
  readonly signedIn = computed(() => this.currentToken() !== null);

  hold(token: string, expiresAt: string | null): void {
    this.currentToken.set(token);
    this.currentExpiry.set(expiresAt === null ? null : Date.parse(expiresAt));
  }

  release(): void {
    this.currentToken.set(null);
    this.currentExpiry.set(null);
  }

  aboutToExpire(atMoment: number = Date.now()): boolean {
    const expiry = this.currentExpiry();

    if (expiry === null) {
      return false;
    }

    return expiry - refreshMarginInMilliseconds <= atMoment;
  }
}
```

### `src/app/api/graphql-resource.ts`

The one place that turns a typed document into a signal. A `undefined` from the variables function leaves the resource idle, which is how a screen says that a read belongs to a signed in customer and there is none.

```ts
import { httpResource, HttpResourceRef } from '@angular/common/http';
import { inject } from '@angular/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { AccessTokenStore } from './access-token-store';
import { accessTokenHeader } from './access-token-header';
import { readGraphqlData } from './graphql-answer';
import { GRAPHQL_URL } from './graphql-url';

export function graphqlResource<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables: () => TVariables | undefined
): HttpResourceRef<TResult | undefined> {
  const graphqlUrl = inject(GRAPHQL_URL);
  const accessTokenStore = inject(AccessTokenStore);
  const query = print(document);

  return httpResource<TResult>(
    () => {
      const currentVariables = variables();

      if (currentVariables === undefined) {
        return undefined;
      }

      return {
        url: graphqlUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...accessTokenHeader(accessTokenStore.token()),
        },
        body: { query, variables: currentVariables },
      };
    },
    { parse: (answer) => readGraphqlData<TResult>(answer) }
  );
}
```

### `src/app/api/authentication-context.ts`

The mark on the refresh request itself, so the interceptor does not try to refresh the refresh.

```ts
import { HttpContextToken } from '@angular/common/http';

export const withoutAccessToken = new HttpContextToken<boolean>(() => false);
```

### `src/app/api/session-refresher.ts`

One refresh at a time. A refresh token is used once and a replay revokes the whole family, so ten requests that wake up together have to share one exchange. `shareReplay` gives them the same answer and `finalize` clears the slot for the next one.

```ts
import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { print } from 'graphql';
import { catchError, finalize, map, Observable, of, shareReplay } from 'rxjs';
import { AccessTokenStore } from './access-token-store';
import { withoutAccessToken } from './authentication-context';
import { RefreshSessionDocument, RefreshSessionMutation } from './generated/contract';
import { GraphqlAnswer } from './graphql-answer';
import { GRAPHQL_URL } from './graphql-url';

@Injectable({ providedIn: 'root' })
export class SessionRefresher {
  private readonly httpClient = inject(HttpClient);
  private readonly graphqlUrl = inject(GRAPHQL_URL);
  private readonly accessTokenStore = inject(AccessTokenStore);

  private runningRefresh: Observable<boolean> | null = null;

  refresh(): Observable<boolean> {
    if (this.runningRefresh === null) {
      this.runningRefresh = this.askForNewAccessToken().pipe(
        finalize(() => {
          this.runningRefresh = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.runningRefresh;
  }

  private askForNewAccessToken(): Observable<boolean> {
    return this.httpClient
      .post<GraphqlAnswer<RefreshSessionMutation>>(
        this.graphqlUrl,
        { query: print(RefreshSessionDocument), variables: {} },
        {
          headers: { 'Content-Type': 'application/json' },
          context: new HttpContext().set(withoutAccessToken, true),
          withCredentials: true,
        }
      )
      .pipe(
        map((answer) => this.holdTokenFrom(answer)),
        catchError(() => {
          this.accessTokenStore.release();
          return of(false);
        })
      );
  }

  private holdTokenFrom(answer: GraphqlAnswer<RefreshSessionMutation>): boolean {
    const payload = answer.data?.refreshSession;

    if (payload === undefined || payload.accessToken === null) {
      this.accessTokenStore.release();
      return false;
    }

    this.accessTokenStore.hold(payload.accessToken, payload.accessTokenExpiresAt);
    return true;
  }
}
```

### `src/app/api/authentication.interceptor.ts`

Cookies on every request to the API, a refresh before a token that is about to expire, and a refresh and one retry on a 401. The retry is the only place the interceptor writes the token, and it writes the new one.

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { accessTokenHeader } from './access-token-header';
import { AccessTokenStore } from './access-token-store';
import { withoutAccessToken } from './authentication-context';
import { GRAPHQL_URL } from './graphql-url';
import { SessionRefresher } from './session-refresher';

const unauthorisedStatus = 401;

export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url !== inject(GRAPHQL_URL)) {
    return next(request);
  }

  const carriesCookies = request.clone({ withCredentials: true });

  if (carriesCookies.context.get(withoutAccessToken)) {
    return next(carriesCookies);
  }

  const accessTokenStore = inject(AccessTokenStore);
  const sessionRefresher = inject(SessionRefresher);
  const sendAgainWithTheNewToken = () =>
    next(carriesCookies.clone({ setHeaders: accessTokenHeader(accessTokenStore.token()) }));

  if (accessTokenStore.aboutToExpire()) {
    return sessionRefresher.refresh().pipe(switchMap(sendAgainWithTheNewToken));
  }

  return next(carriesCookies).pipe(
    catchError((failure: unknown) => {
      if (!(failure instanceof HttpErrorResponse) || failure.status !== unauthorisedStatus) {
        return throwError(() => failure);
      }

      return sessionRefresher
        .refresh()
        .pipe(
          switchMap((refreshed) =>
            refreshed ? sendAgainWithTheNewToken() : throwError(() => failure)
          )
        );
    })
  );
};
```

### `src/app/api/store-api-client.ts`

The Apollo client for the mutations. The context link puts the access token on every operation Apollo sends, which is the same value the read helper puts on a read.

```ts
import { inject, Provider } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { accessTokenHeader } from './access-token-header';
import { AccessTokenStore } from './access-token-store';
import { GRAPHQL_URL } from './graphql-url';

export function provideStoreApiClient(): Provider {
  return provideApollo(() => {
    const accessTokenStore = inject(AccessTokenStore);

    const authorisationLink = new SetContextLink((previousContext) => ({
      headers: {
        ...previousContext.headers,
        ...accessTokenHeader(accessTokenStore.token()),
      },
    }));

    return {
      link: ApolloLink.from([authorisationLink, inject(HttpLink).create({ uri: inject(GRAPHQL_URL) })]),
      cache: new InMemoryCache(),
    };
  });
}
```

### `src/app/api/user-error.ts`

One English sentence per `UserErrorCode`. The contract says a client switches on the code and shows its own text, and the `Record` makes the compiler check that every code has one.

```ts
import { AuthenticationFragment, UserErrorCode } from './generated/contract';

export type UserError = AuthenticationFragment['errors'][number];

const messageByCode: Record<UserErrorCode, string> = {
  PRODUCT_NOT_FOUND: 'That product is no longer in the catalogue.',
  OUT_OF_STOCK: 'There is not enough stock for that quantity.',
  QUANTITY_INVALID: 'Choose a quantity of one or more.',
  CART_LINE_NOT_FOUND: 'That line is no longer in your cart.',
  CART_EMPTY: 'Your cart is empty, so there is nothing to order.',
  CODE_UNKNOWN: 'We do not know that promotion code.',
  CODE_EXPIRED: 'That promotion code is outside its validity window.',
  CODE_EXHAUSTED: 'That promotion code has reached its usage limit.',
  CODE_MINIMUM_NOT_MET: 'Your subtotal is below the minimum this promotion code asks for.',
  EMAIL_TAKEN: 'That email address is already registered.',
  EMAIL_INVALID: 'That is not a valid email address.',
  PASSWORD_TOO_SHORT: 'Choose a password of at least twelve characters.',
  PASSWORD_TOO_LONG: 'Choose a password of at most one hundred and twenty eight characters.',
  CREDENTIALS_INVALID: 'That email address and password do not match a customer.',
  RATE_LIMITED: 'Too many attempts in a short time. Please wait and try again.',
  SESSION_INVALID: 'Your session has ended. Please log in again.',
  SESSION_NOT_FOUND: 'That session has already ended.',
  NOT_AUTHENTICATED: 'Please log in to continue.',
  ORDER_NOT_FOUND: 'We cannot find that order.',
};

export function userErrorMessage(code: UserErrorCode): string {
  return messageByCode[code];
}
```

### `src/app/api/attempt.ts`

The one place a screen turns a request that never arrived into a sentence. It is not a `UserError`, because no change to the input puts it right.

```ts
import { WritableSignal } from '@angular/core';

export const storeUnreachableMessage = 'The store could not be reached. Please try again.';

export async function attempt<TPayload>(
  action: () => Promise<TPayload>,
  problem: WritableSignal<string | null>
): Promise<TPayload | null> {
  problem.set(null);

  try {
    return await action();
  } catch {
    problem.set(storeUnreachableMessage);
    return null;
  }
}
```

## The shared pieces

### `src/shared/money.ts`

`Money` is derived from the contract and never declared. The amount is an integer in cents and the format is the only division by a hundred in the application.

```ts
import type { ProductSummaryFragment } from '../app/api/generated/contract';

export type Money = ProductSummaryFragment['price'];

const centsInOneUnit = 100;

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amount / centsInOneUnit);
}
```

### `src/shared/money.pipe.ts`

The same format in a template.

```ts
import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney, Money } from './money';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(money: Money): string {
    return formatMoney(money);
  }
}
```

### `src/shared/input-value.ts`

Reading a value out of an input event, typed once, so no template needs `$any`.

```ts
export function inputValueOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

export function numberValueOf(event: Event): number {
  return Number.parseInt(inputValueOf(event), 10);
}

export function checkedValueOf(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

export function numberFieldOf(event: Event, fieldName: string): number {
  const form = event.target as HTMLFormElement;
  const field = form.elements.namedItem(fieldName) as HTMLInputElement;

  return Number.parseInt(field.value, 10);
}
```

### `src/shared/services/local-storage.service.ts`

Unchanged from the application that was here. Its one user is now the checkout attempt key.

```ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch (error) {
      console.warn(`LocalStorage get error for key "${key}":`, error);
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`LocalStorage set error for key "${key}":`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`LocalStorage remove error for key "${key}":`, error);
    }
  }

  clear(): void {
    localStorage.clear();
  }

  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}
```

### `src/shared/services/wishlist.service.ts`

The wishlist, on the server for everybody. An anonymous visitor is identified by the `zappy_cart` cookie exactly as the cart is, and the server merges the anonymous list into the customer's on login. This is the one `resource` in the application, because the read goes through the Apollo client rather than straight over HTTP, and its `params` say what the read depends on: who is asking.

```ts
import { computed, inject, Injectable, resource } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AccessTokenStore } from '../../app/api/access-token-store';
import {
  AddToWishlistDocument,
  AddToWishlistMutation,
  AddToWishlistMutationVariables,
  ProductSummaryFragment,
  RemoveFromWishlistDocument,
  RemoveFromWishlistMutation,
  RemoveFromWishlistMutationVariables,
  WishlistDocument,
  WishlistQuery,
  WishlistQueryVariables,
} from '../../app/api/generated/contract';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly apollo = inject(Apollo);
  private readonly accessTokenStore = inject(AccessTokenStore);

  private readonly wishlist = resource({
    params: () => ({ savedFor: this.accessTokenStore.token() }),
    loader: () => this.readFromApi(),
    defaultValue: [] as ProductSummaryFragment[],
  });

  readonly products = this.wishlist.value.asReadonly();
  readonly count = computed(() => this.products().length);
  readonly loading = this.wishlist.isLoading;

  reload(): void {
    this.wishlist.reload();
  }

  contains(productId: string): boolean {
    return this.products().some((product) => product.id === productId);
  }

  async toggle(product: ProductSummaryFragment): Promise<void> {
    if (this.contains(product.id)) {
      await this.remove(product.id);
      return;
    }

    await this.add(product);
  }

  async add(product: ProductSummaryFragment): Promise<void> {
    const answer = await firstValueFrom(
      this.apollo.mutate<AddToWishlistMutation, AddToWishlistMutationVariables>({
        mutation: AddToWishlistDocument,
        variables: { productId: product.id },
      })
    );

    this.wishlist.set(answer.data?.addToWishlist.products ?? this.products());
  }

  async remove(productId: string): Promise<void> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RemoveFromWishlistMutation, RemoveFromWishlistMutationVariables>({
        mutation: RemoveFromWishlistDocument,
        variables: { productId },
      })
    );

    this.wishlist.set(answer.data?.removeFromWishlist.products ?? this.products());
  }

  private async readFromApi(): Promise<ProductSummaryFragment[]> {
    const answer = await firstValueFrom(
      this.apollo.query<WishlistQuery, WishlistQueryVariables>({
        query: WishlistDocument,
        fetchPolicy: 'network-only',
      })
    );

    return answer.data?.wishlist ?? [];
  }
}
```

### `src/shared/components/product-image/product-image.component.ts`

One `img` with a fallback. `Product.imageUrl` is a path the frontend serves, and this frontend serves one placeholder drawing, so a missing file shows the placeholder rather than a broken image.

```ts
import { Component, computed, input, signal } from '@angular/core';

export const placeholderImageUrl = '/images/products/placeholder.svg';

export type ProductImageSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-product-image',
  template: `<img
    class="product-image"
    [class]="'product-image--' + size()"
    [src]="source()"
    [alt]="alternativeText()"
    (error)="usePlaceholder()"
  />`,
  styleUrl: './product-image.component.scss',
})
export class ProductImageComponent {
  readonly imageUrl = input<string | null>(null);
  readonly name = input.required<string>();
  readonly size = input<ProductImageSize>('medium');
  readonly decorative = input(false);

  private readonly imageMissing = signal(false);

  protected readonly source = computed(() => {
    const url = this.imageUrl();
    return this.imageMissing() || url === null ? placeholderImageUrl : url;
  });

  protected readonly alternativeText = computed(() => (this.decorative() ? '' : this.name()));

  protected usePlaceholder(): void {
    this.imageMissing.set(true);
  }
}
```

### `src/shared/components/product-image/product-image.component.scss`

Three sizes.

```scss
.product-image {
  width: 100%;
  object-fit: contain;
  background: #f9fafb;
  border-radius: 0.375rem;

  &--small {
    width: 3.5rem;
    height: 3.5rem;
  }

  &--medium {
    height: 12rem;
  }

  &--large {
    height: 20rem;
  }
}
```

### `src/shared/components/user-errors/user-errors.component.ts`

Three inputs and one list. `errors` is what the contract answered, `note` is an extra sentence for this situation such as how many are left, and `problem` is a request that never arrived.

```ts
import { Component, computed, input } from '@angular/core';
import { UserError, userErrorMessage } from '../../../app/api/user-error';

@Component({
  selector: 'app-user-errors',
  templateUrl: './user-errors.component.html',
  styleUrl: './user-errors.component.scss',
})
export class UserErrorsComponent {
  readonly errors = input<UserError[]>([]);
  readonly problem = input<string | null>(null);
  readonly note = input<string | null>(null);

  protected readonly sentences = computed(() => {
    const spelled = this.errors().map((error) => userErrorMessage(error.code));
    const problem = this.problem();
    const note = this.note();

    return [
      ...spelled,
      ...(note === null ? [] : [note]),
      ...(problem === null ? [] : [problem]),
    ];
  });
}
```

### `src/shared/components/user-errors/user-errors.component.html`



```html
@if (sentences().length > 0) {
  <ul class="user-errors" role="alert">
    @for (sentence of sentences(); track sentence) {
      <li class="user-errors__item">{{ sentence }}</li>
    }
  </ul>
}
```

### `src/shared/components/user-errors/user-errors.component.scss`



```scss
.user-errors {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #fca5a5;
  border-radius: 0.375rem;
  background: #fef2f2;
  color: #991b1b;

  &__item + &__item {
    margin-top: 0.25rem;
  }
}
```

### `src/shared/components/login-form/login-form.component.ts`

One form for logging in and for registering, used by the account screen and by the checkout screen, so the copy and the rules exist once.

```ts
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../../app/account/session.service';
import { attempt } from '../../../app/api/attempt';
import { UserError } from '../../../app/api/user-error';
import { inputValueOf } from '../../input-value';
import { UserErrorsComponent } from '../user-errors/user-errors.component';

export type LoginFormMode = 'login' | 'register';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  imports: [UserErrorsComponent],
})
export class LoginFormComponent {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly mode = input<LoginFormMode>('login');
  readonly returnTo = input<string | null>(null);

  protected readonly valueOf = inputValueOf;
  protected readonly registering = computed(() => this.mode() === 'register');
  protected readonly action = computed(() => (this.registering() ? 'Register' : 'Log in'));
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly problem = signal<string | null>(null);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.busy.set(true);

    const answered = await attempt(() => this.authenticate(), this.problem);

    this.busy.set(false);
    this.errors.set(answered ?? []);

    if (answered !== null && answered.length === 0) {
      await this.router.navigateByUrl(this.returnTo() ?? '/account');
    }
  }

  private authenticate(): Promise<UserError[]> {
    if (this.registering()) {
      return this.sessionService.register({
        name: this.name(),
        email: this.email(),
        password: this.password(),
      });
    }

    return this.sessionService.logIn({ email: this.email(), password: this.password() });
  }
}
```

### `src/shared/components/login-form/login-form.component.html`



```html
<form class="login-form" [attr.aria-label]="action()" (submit)="submit($event)">
  <app-user-errors [errors]="errors()" [problem]="problem()" />

  @if (registering()) {
    <div class="field">
      <label class="field__label" for="login-form-name">Name</label>
      <input
        class="field__input"
        id="login-form-name"
        name="name"
        type="text"
        autocomplete="name"
        required
        [value]="name()"
        (input)="name.set(valueOf($event))"
      />
    </div>
  }

  <div class="field">
    <label class="field__label" for="login-form-email">Email address</label>
    <input
      class="field__input"
      id="login-form-email"
      name="email"
      type="email"
      autocomplete="email"
      required
      [value]="email()"
      (input)="email.set(valueOf($event))"
    />
  </div>

  <div class="field">
    <label class="field__label" for="login-form-password">Password</label>
    <input
      class="field__input"
      id="login-form-password"
      name="password"
      type="password"
      [attr.autocomplete]="registering() ? 'new-password' : 'current-password'"
      required
      [value]="password()"
      (input)="password.set(valueOf($event))"
    />
    @if (registering()) {
      <p class="field__hint">At least twelve characters.</p>
    }
  </div>

  <button class="button" type="submit" [disabled]="busy()">{{ action() }}</button>
</form>
```

### `src/shared/components/login-form/login-form.component.scss`



```scss
.login-form {
  max-width: 26rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;

  &__heading {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  &__switch {
    margin-top: 0.75rem;
    background: none;
    border: none;
    padding: 0;
    color: #2563eb;
    text-decoration: underline;
    font: inherit;
    cursor: pointer;
  }
}
```

### `src/shared/components/product-card/product-card.component.ts`

The card of the old application, on the contract's product and on signal inputs and outputs.

```ts
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductSummaryFragment } from '../../../app/api/generated/contract';
import { MoneyPipe } from '../../money.pipe';
import { ProductImageComponent } from '../product-image/product-image.component';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent],
})
export default class ProductCardComponent {
  readonly product = input.required<ProductSummaryFragment>();
  readonly inWishlist = input(false);

  readonly addToCart = output<ProductSummaryFragment>();
  readonly toggleWishlist = output<ProductSummaryFragment>();
}
```

### `src/shared/components/product-card/product-card.component.html`



```html
<article class="card">
  <a class="card__link" [routerLink]="['/product', product().slug]">
    <app-product-image
      [imageUrl]="product().imageUrl"
      [name]="product().name"
      [decorative]="true"
    />
    <h3 class="card__title">{{ product().name }}</h3>
  </a>

  <p class="card__category">{{ product().category.name }}</p>
  <p class="card__price">{{ product().price | money }}</p>

  @if (product().stock === 0) {
    <p class="card__stock card__stock--empty">Out of stock</p>
  } @else {
    <p class="card__stock">{{ product().stock }} in stock</p>
  }

  <div class="card__actions">
    <button
      class="card__action"
      type="button"
      [disabled]="product().stock === 0"
      (click)="addToCart.emit(product())"
    >
      Add to cart
    </button>

    <button
      class="card__action-wish-list"
      [class.card__action-wish-list--active]="inWishlist()"
      type="button"
      (click)="toggleWishlist.emit(product())"
    >
      {{ inWishlist() ? 'Remove from wishlist' : 'Save to wishlist' }}
    </button>
  </div>
</article>
```

### `src/shared/components/product-card/product-card.component.scss`



```scss
.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;

  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.5s ease;

  &:hover {
    transition: box-shadow 0.5s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  &__link {
    display: block;
    margin-bottom: 0.5rem;
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0.5rem 0 0.25rem;
  }

  &__category {
    font-size: 0.875rem;
    color: #4b5563;
  }

  &__price {
    font-size: 1rem;
    font-weight: 700;
    color: #059669;
    margin-top: 0.5rem;
  }

  &__stock {
    font-size: 0.8125rem;
    color: #4b5563;
    margin-top: 0.25rem;

    &--empty {
      color: #b91c1c;
      font-weight: 600;
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  &__action,
  &__action-wish-list {
    background-color: white;
    transition: background-color 0.5s ease;
    color: black;
    border: 1px solid #797a7c;
    border-radius: 4px;
    padding: 8px 10px;

    &:hover:not(:disabled) {
      background-color: rgb(206, 162, 191);
      cursor: pointer;
    }

    &:disabled {
      color: #9ca3af;
      border-color: #d1d5db;
    }
  }

  &__action-wish-list--active {
    background-color: rgb(164, 238, 154);
  }
}
```

### `public/images/products/placeholder.svg`

The one drawing this frontend ships. Product photography is out of scope, as `docs/domain.md` says.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Product drawing placeholder">
  <rect width="200" height="200" fill="#f3f4f6" />
  <path d="M56 78h88l-10 66H66z" fill="none" stroke="#9ca3af" stroke-width="6" stroke-linejoin="round" />
  <path d="M80 78a20 20 0 0 1 40 0" fill="none" stroke="#9ca3af" stroke-width="6" stroke-linecap="round" />
  <circle cx="100" cy="112" r="6" fill="#9ca3af" />
</svg>
```

## The catalogue

### `src/app/catalogue/catalogue.component.ts`

The category and the search term are signal inputs, bound from the url by `withComponentInputBinding`. Both form controls start from the url through `linkedSignal`, and the Filter button navigates rather than filtering in place, so the url stays the state and a filtered catalogue is a link a visitor can share.

```ts
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import ProductCardComponent from '../../shared/components/product-card/product-card.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { checkedValueOf, inputValueOf } from '../../shared/input-value';
import { WishlistService } from '../../shared/services/wishlist.service';
import { attempt } from '../api/attempt';
import { CatalogueDocument, ProductSummaryFragment } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { UserError } from '../api/user-error';
import { CartService } from '../cart/cart.service';
import { stockNote } from '../cart/stock-note';

const cataloguePageSize = 24;
const maximumPageSize = 100;

@Component({
  selector: 'app-catalogue',
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.scss',
  imports: [ProductCardComponent, UserErrorsComponent],
})
export class CatalogueComponent {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);

  readonly category = input('');
  readonly search = input('');
  readonly stock = input('');

  protected readonly valueOf = inputValueOf;
  protected readonly checkedOf = checkedValueOf;
  protected readonly searchTerm = linkedSignal(() => this.search());
  protected readonly chosenCategory = linkedSignal(() => this.category());
  protected readonly inStockOnly = linkedSignal(() => this.stock() === 'available');
  protected readonly pageSize = signal(cataloguePageSize);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly note = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);

  private readonly catalogue = graphqlResource(CatalogueDocument, () => ({
    filter: {
      categorySlug: this.category() === '' ? null : this.category(),
      nameContains: this.search() === '' ? null : this.search(),
      inStockOnly: this.stock() === 'available',
    },
    first: this.pageSize(),
  }));

  protected readonly loading = this.catalogue.isLoading;
  protected readonly unreachable = computed(() => this.catalogue.error() !== undefined);
  protected readonly categories = computed(() => this.catalogue.value()?.categories ?? []);
  protected readonly products = computed(
    () => this.catalogue.value()?.products.edges.map((edge) => edge.node) ?? []
  );
  protected readonly totalCount = computed(() => this.catalogue.value()?.products.totalCount ?? 0);
  protected readonly canShowMore = computed(
    () =>
      (this.catalogue.value()?.products.pageInfo.hasNextPage ?? false) &&
      this.pageSize() < maximumPageSize
  );

  protected saved(product: ProductSummaryFragment): boolean {
    return this.wishlistService.contains(product.id);
  }

  protected applyFilter(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/'], {
      queryParams: {
        category: this.chosenCategory() === '' ? null : this.chosenCategory(),
        search: this.searchTerm() === '' ? null : this.searchTerm(),
        stock: this.inStockOnly() ? 'available' : null,
      },
    });
  }

  protected showMore(): void {
    this.pageSize.update((size) => Math.min(size + cataloguePageSize, maximumPageSize));
  }

  protected async addToCart(product: ProductSummaryFragment): Promise<void> {
    const change = await attempt(() => this.cartService.addProduct(product.id, 1), this.problem);

    this.errors.set(change?.errors ?? []);
    this.note.set(stockNote(change));
  }

  protected async toggleWishlist(product: ProductSummaryFragment): Promise<void> {
    await attempt(() => this.wishlistService.toggle(product), this.problem);
  }
}
```

### `src/app/catalogue/catalogue.component.html`



```html
<section class="catalogue container">
  <h1 class="catalogue__heading">Catalogue</h1>

  <form class="catalogue__filter" aria-label="Filter the catalogue" (submit)="applyFilter($event)">
    <div class="field">
      <label class="field__label" for="catalogue-search">Search by name</label>
      <input
        class="field__input"
        id="catalogue-search"
        name="search"
        type="search"
        [value]="searchTerm()"
        (input)="searchTerm.set(valueOf($event))"
      />
    </div>

    <div class="field">
      <label class="field__label" for="catalogue-category">Category</label>
      <select
        class="field__input"
        id="catalogue-category"
        name="category"
        (change)="chosenCategory.set(valueOf($event))"
      >
        <option value="" [selected]="chosenCategory() === ''">All products</option>
        @for (option of categories(); track option.id) {
          <option [value]="option.slug" [selected]="chosenCategory() === option.slug">
            {{ option.name }}
          </option>
        }
      </select>
    </div>

    <div class="field catalogue__in-stock">
      <input
        id="catalogue-in-stock-only"
        name="stock"
        type="checkbox"
        [checked]="inStockOnly()"
        (change)="inStockOnly.set(checkedOf($event))"
      />
      <label for="catalogue-in-stock-only">In stock only</label>
    </div>

    <button class="button catalogue__filter-action" type="submit">Filter</button>
  </form>

  <app-user-errors [errors]="errors()" [note]="note()" [problem]="problem()" />

  @if (loading()) {
    <p class="catalogue__status" role="status">Loading the catalogue.</p>
  } @else if (unreachable()) {
    <p class="catalogue__status" role="status">
      The catalogue could not be loaded. Start the mock server on port 4000 and try again.
    </p>
  } @else {
    <p class="catalogue__status" role="status">{{ totalCount() }} products match.</p>

    <div class="catalogue__grid">
      @for (product of products(); track product.id) {
        <app-product-card
          [product]="product"
          [inWishlist]="saved(product)"
          (addToCart)="addToCart($event)"
          (toggleWishlist)="toggleWishlist($event)"
        />
      }
    </div>

    @if (canShowMore()) {
      <button class="button" type="button" (click)="showMore()">Show more products</button>
    }
  }
</section>
```

### `src/app/catalogue/catalogue.component.scss`



```scss
.catalogue {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__filter {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
    margin-bottom: 1.5rem;

    .field {
      margin-bottom: 0;
      min-width: 14rem;
    }
  }

  &__in-stock {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;

    label {
      font-weight: 600;
      font-size: 0.875rem;
    }
  }

  &__filter-action {
    height: 2.5rem;
  }

  &__status {
    color: #4b5563;
    margin-bottom: 1rem;
  }

  &__grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    align-items: stretch;
    margin-bottom: 1.5rem;
  }
}
```

## The product screen

### `src/app/product/product.component.ts`

One read by slug, one quantity, two actions.

```ts
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { numberValueOf } from '../../shared/input-value';
import { MoneyPipe } from '../../shared/money.pipe';
import { WishlistService } from '../../shared/services/wishlist.service';
import { attempt } from '../api/attempt';
import { ProductBySlugDocument, ProductSummaryFragment } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { UserError } from '../api/user-error';
import { CartService } from '../cart/cart.service';
import { stockNote } from '../cart/stock-note';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent, UserErrorsComponent],
})
export class ProductComponent {
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);

  readonly slug = input.required<string>();

  protected readonly quantityOf = numberValueOf;
  protected readonly quantity = signal(1);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly note = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);
  protected readonly added = signal(false);

  private readonly productQuery = graphqlResource(ProductBySlugDocument, () => ({
    slug: this.slug(),
  }));

  protected readonly loading = this.productQuery.isLoading;
  protected readonly unreachable = computed(() => this.productQuery.error() !== undefined);
  protected readonly product = computed(() => this.productQuery.value()?.product ?? null);

  protected saved(product: ProductSummaryFragment): boolean {
    return this.wishlistService.contains(product.id);
  }

  protected async addToCart(product: ProductSummaryFragment): Promise<void> {
    this.added.set(false);

    const change = await attempt(
      () => this.cartService.addProduct(product.id, this.quantity()),
      this.problem
    );

    this.errors.set(change?.errors ?? []);
    this.note.set(stockNote(change));
    this.added.set(change !== null && change.errors.length === 0);
  }

  protected async toggleWishlist(product: ProductSummaryFragment): Promise<void> {
    await attempt(() => this.wishlistService.toggle(product), this.problem);
  }
}
```

### `src/app/product/product.component.html`



```html
<section class="product container">
  @if (loading()) {
    <h1 class="product__heading">Product</h1>
    <p class="product__status" role="status">Loading the product.</p>
  } @else if (unreachable()) {
    <h1 class="product__heading">Product</h1>
    <p class="product__status" role="status">
      The product could not be loaded. Start the mock server on port 4000 and try again.
    </p>
  } @else if (product(); as item) {
    <nav class="product__breadcrumb" aria-label="Breadcrumb">
      <a [routerLink]="['/']">Catalogue</a>
      <span aria-hidden="true">/</span>
      <a [routerLink]="['/']" [queryParams]="{ category: item.category.slug }">
        {{ item.category.name }}
      </a>
    </nav>

    <h1 class="product__heading">{{ item.name }}</h1>

    <div class="product__body">
      <app-product-image [imageUrl]="item.imageUrl" [name]="item.name" size="large" />

      <div class="product__details">
        <p class="product__price">{{ item.price | money }}</p>

        @if (item.stock === 0) {
          <p class="product__stock product__stock--empty">Out of stock</p>
        } @else {
          <p class="product__stock">{{ item.stock }} in stock</p>
        }

        <p class="product__description">{{ item.description }}</p>

        <app-user-errors [errors]="errors()" [note]="note()" [problem]="problem()" />

        @if (added()) {
          <p class="product__added" role="status">Added to your cart.</p>
        }

        <div class="field">
          <label class="field__label" for="product-quantity">Quantity</label>
          <input
            class="field__input product__quantity"
            id="product-quantity"
            name="quantity"
            type="number"
            min="1"
            [max]="item.stock"
            [value]="quantity()"
            (input)="quantity.set(quantityOf($event))"
          />
        </div>

        <div class="product__actions">
          <button
            class="button"
            type="button"
            [disabled]="item.stock === 0"
            (click)="addToCart(item)"
          >
            Add to cart
          </button>

          <button class="button button--quiet" type="button" (click)="toggleWishlist(item)">
            {{ saved(item) ? 'Remove from wishlist' : 'Save to wishlist' }}
          </button>
        </div>
      </div>
    </div>
  } @else {
    <h1 class="product__heading">Product not found</h1>
    <p class="product__status" role="status">No product in the catalogue has that address.</p>
    <a class="button" [routerLink]="['/']">Back to the catalogue</a>
  }
</section>
```

### `src/app/product/product.component.scss`



```scss
.product {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__breadcrumb {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 0.75rem;

    a {
      text-decoration: underline;
    }
  }

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__body {
    display: grid;
    gap: 2rem;
    grid-template-columns: minmax(0, 1fr);
  }

  &__price {
    font-size: 1.5rem;
    font-weight: 700;
    color: #059669;
  }

  &__stock {
    color: #4b5563;
    margin-top: 0.25rem;

    &--empty {
      color: #b91c1c;
      font-weight: 600;
    }
  }

  &__description {
    margin: 1rem 0;
    max-width: 44rem;
    line-height: 1.6;
  }

  &__added {
    margin-bottom: 1rem;
    color: #047857;
    font-weight: 600;
  }

  &__quantity {
    max-width: 6rem;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  &__status {
    color: #4b5563;
    margin-bottom: 1rem;
  }
}

@media (min-width: 768px) {
  .product__body {
    grid-template-columns: minmax(0, 24rem) minmax(0, 1fr);
  }
}
```

## The cart

### `src/app/cart/cart.service.ts`

The cart read and the five cart mutations. Every mutation answers with the whole cart, so `accept` writes it into the resource and the screen renders the new state without a second request. A refused mutation carries no cart, and the one the visitor had stays.

```ts
import { computed, inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import {
  AddToCartDocument,
  AddToCartMutation,
  AddToCartMutationVariables,
  ApplyPromotionCodeDocument,
  ApplyPromotionCodeMutation,
  ApplyPromotionCodeMutationVariables,
  CartChangeFragment,
  CartDocument,
  ChangeCartLineQuantityDocument,
  ChangeCartLineQuantityMutation,
  ChangeCartLineQuantityMutationVariables,
  RemoveCartLineDocument,
  RemoveCartLineMutation,
  RemoveCartLineMutationVariables,
  RemovePromotionCodeDocument,
  RemovePromotionCodeMutation,
  RemovePromotionCodeMutationVariables,
} from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apollo = inject(Apollo);
  private readonly cartQuery = graphqlResource(CartDocument, () => ({}));

  readonly loading = this.cartQuery.isLoading;
  readonly unreachable = computed(() => this.cartQuery.error() !== undefined);
  readonly cart = computed(() => this.cartQuery.value()?.cart ?? null);
  readonly lines = computed(() => this.cart()?.lines ?? []);
  readonly itemCount = computed(() =>
    this.lines().reduce((count, line) => count + line.quantity, 0)
  );
  readonly total = computed(() => this.cart()?.total ?? null);
  readonly empty = computed(() => this.lines().length === 0);

  reload(): void {
    this.cartQuery.reload();
  }

  async addProduct(productId: string, quantity: number): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<AddToCartMutation, AddToCartMutationVariables>({
        mutation: AddToCartDocument,
        variables: { productId, quantity },
      })
    );

    return this.accept(answer.data?.addToCart);
  }

  async changeLineQuantity(lineId: string, quantity: number): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<ChangeCartLineQuantityMutation, ChangeCartLineQuantityMutationVariables>({
        mutation: ChangeCartLineQuantityDocument,
        variables: { lineId, quantity },
      })
    );

    return this.accept(answer.data?.changeCartLineQuantity);
  }

  async removeLine(lineId: string): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RemoveCartLineMutation, RemoveCartLineMutationVariables>({
        mutation: RemoveCartLineDocument,
        variables: { lineId },
      })
    );

    return this.accept(answer.data?.removeCartLine);
  }

  async applyPromotionCode(code: string): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<ApplyPromotionCodeMutation, ApplyPromotionCodeMutationVariables>({
        mutation: ApplyPromotionCodeDocument,
        variables: { code },
      })
    );

    return this.accept(answer.data?.applyPromotionCode);
  }

  async removePromotionCode(): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RemovePromotionCodeMutation, RemovePromotionCodeMutationVariables>({
        mutation: RemovePromotionCodeDocument,
      })
    );

    return this.accept(answer.data?.removePromotionCode);
  }

  private accept(change: CartChangeFragment | undefined): CartChangeFragment {
    if (change === undefined) {
      throw new Error('The store API answered without a cart payload.');
    }

    if (change.cart !== null) {
      this.cartQuery.set({ cart: change.cart });
    }

    return change;
  }
}
```

### `src/app/cart/stock-note.ts`

`CartPayload.availableStock` as a sentence, in one place, because the catalogue, the product screen and the cart all show it.

```ts
import { CartChangeFragment } from '../api/generated/contract';

export function stockNote(change: CartChangeFragment | null): string | null {
  if (change === null || change.availableStock === null) {
    return null;
  }

  return `We have ${change.availableStock} of this product left.`;
}
```

### `src/app/cart/cart.component.ts`



```ts
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { numberFieldOf } from '../../shared/input-value';
import { MoneyPipe } from '../../shared/money.pipe';
import { attempt } from '../api/attempt';
import { CartChangeFragment } from '../api/generated/contract';
import { UserError } from '../api/user-error';
import { CartService } from './cart.service';
import { stockNote } from './stock-note';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent, UserErrorsComponent],
})
export class CartComponent {
  private readonly cartService = inject(CartService);

  protected readonly errors = signal<UserError[]>([]);
  protected readonly note = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);

  protected readonly loading = this.cartService.loading;
  protected readonly unreachable = this.cartService.unreachable;
  protected readonly cart = this.cartService.cart;
  protected readonly lines = this.cartService.lines;
  protected readonly empty = this.cartService.empty;
  protected readonly itemCount = this.cartService.itemCount;

  protected async updateQuantity(lineId: string, event: Event): Promise<void> {
    event.preventDefault();
    const quantity = numberFieldOf(event, 'quantity');

    this.record(
      await attempt(() => this.cartService.changeLineQuantity(lineId, quantity), this.problem)
    );
  }

  protected async removeLine(lineId: string): Promise<void> {
    this.record(await attempt(() => this.cartService.removeLine(lineId), this.problem));
  }

  private record(change: CartChangeFragment | null): void {
    this.errors.set(change?.errors ?? []);
    this.note.set(stockNote(change));
  }
}
```

### `src/app/cart/cart.component.html`



```html
<section class="cart container">
  <h1 class="cart__heading">Cart</h1>

  <app-user-errors [errors]="errors()" [note]="note()" [problem]="problem()" />

  @if (loading()) {
    <p class="cart__status" role="status">Loading your cart.</p>
  } @else if (unreachable()) {
    <p class="cart__status" role="status">
      Your cart could not be loaded. Start the mock server on port 4000 and try again.
    </p>
  } @else if (empty()) {
    <p class="cart__status" role="status">Your cart is empty.</p>
    <a class="button" [routerLink]="['/']">Back to the catalogue</a>
  } @else {
    <p class="cart__status" role="status">{{ itemCount() }} items in your cart.</p>

    <table class="cart__table">
      <caption class="cart__caption">
        The products in your cart
      </caption>
      <thead>
        <tr>
          <th scope="col">Product</th>
          <th scope="col">Price</th>
          <th scope="col">Quantity</th>
          <th scope="col">Line total</th>
          <th scope="col">Remove</th>
        </tr>
      </thead>
      <tbody>
        @for (line of lines(); track line.id) {
          <tr>
            <th class="cart__product" scope="row">
              <app-product-image
                [imageUrl]="line.product.imageUrl"
                [name]="line.product.name"
                size="small"
                [decorative]="true"
              />
              <a [routerLink]="['/product', line.product.slug]">{{ line.product.name }}</a>
            </th>
            <td>{{ line.product.price | money }}</td>
            <td>
              <form class="cart__quantity-form" (submit)="updateQuantity(line.id, $event)">
                <label class="cart__quantity-label" [for]="'cart-quantity-' + line.id">
                  Quantity of {{ line.product.name }}
                </label>
                <input
                  class="field__input cart__quantity"
                  [id]="'cart-quantity-' + line.id"
                  name="quantity"
                  type="number"
                  min="1"
                  [max]="line.product.stock"
                  [value]="line.quantity"
                />
                <button class="button button--quiet" type="submit">Update</button>
              </form>
            </td>
            <td>{{ line.lineTotal | money }}</td>
            <td>
              <button class="button button--quiet" type="button" (click)="removeLine(line.id)">
                Remove {{ line.product.name }}
              </button>
            </td>
          </tr>
        }
      </tbody>
    </table>

    @if (cart(); as currentCart) {
      <dl class="cart__summary">
        <dt>Subtotal</dt>
        <dd>{{ currentCart.subtotal | money }}</dd>

        @if (currentCart.promotion; as promotion) {
          <dt>Promotion {{ promotion.code }}</dt>
          <dd>{{ promotion.discount | money }}</dd>
        }

        <dt>Shipping</dt>
        <dd>{{ currentCart.shipping | money }}</dd>

        <dt class="cart__total-term">Total</dt>
        <dd class="cart__total-value">{{ currentCart.total | money }}</dd>
      </dl>
    }

    <a class="button" [routerLink]="['/checkout']">Go to checkout</a>
  }
</section>
```

### `src/app/cart/cart.component.scss`



```scss
.cart {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__status {
    color: #4b5563;
    margin-bottom: 1rem;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;

    th,
    td {
      text-align: left;
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
  }

  &__caption {
    text-align: left;
    padding-bottom: 0.5rem;
    color: #4b5563;
  }

  &__product {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 500;

    a {
      text-decoration: underline;
    }
  }

  &__quantity-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  &__quantity {
    max-width: 5rem;
  }

  &__quantity-form {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__summary {
    display: grid;
    grid-template-columns: minmax(0, 12rem) minmax(0, 1fr);
    gap: 0.5rem 1rem;
    max-width: 32rem;
    margin-bottom: 1.5rem;

    dt {
      color: #4b5563;
    }
  }

  &__total-term,
  &__total-value {
    font-weight: 700;
    font-size: 1.125rem;
  }
}
```

## The checkout

### `src/app/checkout/idempotency-key.ts`

A value the client makes up once per checkout attempt.

```ts
export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `checkout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

### `src/app/checkout/checkout-attempt.service.ts`

The key in local storage, so a reload in the middle of a checkout does not make a second one. It is cleared when the order is placed.

```ts
import { inject, Injectable } from '@angular/core';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { newIdempotencyKey } from './idempotency-key';

const storageKey = 'checkout-idempotency-key';

@Injectable({ providedIn: 'root' })
export class CheckoutAttempt {
  private readonly storage = inject(LocalStorageService);

  idempotencyKey(): string {
    const stored = this.storage.get<string>(storageKey);

    if (stored !== null) {
      return stored;
    }

    const created = newIdempotencyKey();
    this.storage.set(storageKey, created);

    return created;
  }

  finish(): void {
    this.storage.remove(storageKey);
  }
}
```

### `src/app/checkout/order.service.ts`

Placing the order. The cart is read again when one is placed, because the server emptied it.

```ts
import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import {
  PlaceOrderDocument,
  PlaceOrderMutation,
  PlaceOrderMutationVariables,
} from '../api/generated/contract';
import { CartService } from '../cart/cart.service';

export type PlacedOrder = PlaceOrderMutation['placeOrder'];

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apollo = inject(Apollo);
  private readonly cartService = inject(CartService);

  async place(idempotencyKey: string): Promise<PlacedOrder> {
    const answer = await firstValueFrom(
      this.apollo.mutate<PlaceOrderMutation, PlaceOrderMutationVariables>({
        mutation: PlaceOrderDocument,
        variables: { idempotencyKey },
      })
    );

    const payload = answer.data?.placeOrder;

    if (payload === undefined) {
      throw new Error('The store API answered without an order payload.');
    }

    if (payload.order !== null) {
      this.cartService.reload();
    }

    return payload;
  }
}
```

### `src/app/checkout/checkout.component.ts`



```ts
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { inputValueOf } from '../../shared/input-value';
import { MoneyPipe } from '../../shared/money.pipe';
import { SessionService } from '../account/session.service';
import { attempt } from '../api/attempt';
import { UserError } from '../api/user-error';
import { CartService } from '../cart/cart.service';
import { CheckoutAttempt } from './checkout-attempt.service';
import { OrderService } from './order.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  imports: [RouterLink, MoneyPipe, UserErrorsComponent],
})
export class CheckoutComponent {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly sessionService = inject(SessionService);
  private readonly orderService = inject(OrderService);
  private readonly checkoutAttempt = inject(CheckoutAttempt);

  protected readonly valueOf = inputValueOf;
  protected readonly customer = this.sessionService.customer;
  protected readonly cart = this.cartService.cart;
  protected readonly lines = this.cartService.lines;
  protected readonly empty = this.cartService.empty;

  protected readonly promotionCode = signal('');
  protected readonly placing = signal(false);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly problem = signal<string | null>(null);

  protected async applyPromotionCode(event: Event): Promise<void> {
    event.preventDefault();

    const change = await attempt(
      () => this.cartService.applyPromotionCode(this.promotionCode()),
      this.problem
    );

    this.errors.set(change?.errors ?? []);
  }

  protected async placeOrder(): Promise<void> {
    this.placing.set(true);

    const payload = await attempt(
      () => this.orderService.place(this.checkoutAttempt.idempotencyKey()),
      this.problem
    );

    this.placing.set(false);
    this.errors.set(payload?.errors ?? []);

    if (payload?.order != null) {
      this.checkoutAttempt.finish();
      await this.router.navigate(['/orders', payload.order.id]);
    }
  }
}
```

### `src/app/checkout/checkout.component.html`



```html
<section class="checkout container">
  <h1 class="checkout__heading">Checkout</h1>

  <app-user-errors [errors]="errors()" [problem]="problem()" />

  @if (empty()) {
    <p class="checkout__status" role="status">Your cart is empty, so there is nothing to order.</p>
    <a class="button" [routerLink]="['/']">Back to the catalogue</a>
  } @else {
    @if (customer(); as signedInCustomer) {
      <p class="checkout__status">{{ signedInCustomer.name }}, check your order and place it.</p>
    }

    <table class="checkout__table">
      <caption class="checkout__caption">
        What you are about to order
      </caption>
      <thead>
        <tr>
          <th scope="col">Product</th>
          <th scope="col">Quantity</th>
          <th scope="col">Line total</th>
        </tr>
      </thead>
      <tbody>
        @for (line of lines(); track line.id) {
          <tr>
            <th scope="row">{{ line.product.name }}</th>
            <td>{{ line.quantity }}</td>
            <td>{{ line.lineTotal | money }}</td>
          </tr>
        }
      </tbody>
    </table>

    <form
      class="checkout__promotion"
      aria-label="Promotion code"
      (submit)="applyPromotionCode($event)"
    >
      <label class="field__label" for="checkout-promotion-code">Promotion code</label>
      <div class="checkout__promotion-row">
        <input
          class="field__input"
          id="checkout-promotion-code"
          name="promotionCode"
          type="text"
          [value]="promotionCode()"
          (input)="promotionCode.set(valueOf($event))"
        />
        <button class="button" type="submit">Apply code</button>
      </div>
    </form>

    @if (cart(); as currentCart) {
      @if (currentCart.promotion; as promotion) {
        <p class="checkout__promotion-applied">
          {{ promotion.code }} takes off {{ promotion.discount | money }}.
        </p>
      }

      <dl class="checkout__summary">
        <dt>Subtotal</dt>
        <dd>{{ currentCart.subtotal | money }}</dd>

        <dt>Shipping</dt>
        <dd>{{ currentCart.shipping | money }}</dd>

        <dt class="checkout__total-term">Total</dt>
        <dd class="checkout__total-value">{{ currentCart.total | money }}</dd>
      </dl>
    }

    <p class="checkout__payment">Payment is simulated, so the order is placed as paid.</p>

    <button class="button" type="button" [disabled]="placing()" (click)="placeOrder()">
      Place order
    </button>

    <a class="checkout__back" [routerLink]="['/cart']">Back to your cart</a>
  }
</section>
```

### `src/app/checkout/checkout.component.scss`



```scss
.checkout {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__status {
    color: #4b5563;
    margin-bottom: 1rem;
  }

  &__table {
    width: 100%;
    max-width: 40rem;
    border-collapse: collapse;
    margin-bottom: 1.5rem;

    th,
    td {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
  }

  &__caption {
    text-align: left;
    padding-bottom: 0.5rem;
    color: #4b5563;
  }

  &__promotion {
    margin-bottom: 1rem;
  }

  &__promotion-row {
    display: flex;
    gap: 0.5rem;
    max-width: 26rem;
  }

  &__promotion-applied {
    margin-bottom: 1rem;
    color: #047857;
    font-weight: 600;
  }

  &__summary {
    display: grid;
    grid-template-columns: minmax(0, 12rem) minmax(0, 1fr);
    gap: 0.5rem 1rem;
    max-width: 32rem;
    margin-bottom: 1rem;

    dt {
      color: #4b5563;
    }
  }

  &__total-term,
  &__total-value {
    font-weight: 700;
    font-size: 1.125rem;
  }

  &__payment {
    color: #4b5563;
    margin-bottom: 1rem;
  }

  &__back {
    display: inline-block;
    margin-left: 1rem;
    text-decoration: underline;
  }
}
```

## The order confirmation

### `src/app/order-confirmation/order-confirmation.component.ts`

One read by id, idle while nobody is signed in.

```ts
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoneyPipe } from '../../shared/money.pipe';
import { SessionService } from '../account/session.service';
import { OrderByIdDocument } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.scss',
  imports: [RouterLink, MoneyPipe],
})
export class OrderConfirmationComponent {
  private readonly sessionService = inject(SessionService);

  readonly orderId = input.required<string>();

  protected readonly signedIn = this.sessionService.signedIn;

  private readonly orderQuery = graphqlResource(OrderByIdDocument, () =>
    this.signedIn() ? { id: this.orderId() } : undefined
  );

  protected readonly loading = this.orderQuery.isLoading;
  protected readonly unreachable = computed(() => this.orderQuery.error() !== undefined);
  protected readonly order = computed(() => this.orderQuery.value()?.order ?? null);
}
```

### `src/app/order-confirmation/order-confirmation.component.html`



```html
<section class="order-confirmation container">
  @if (loading()) {
    <h1 class="order-confirmation__heading">Order</h1>
    <p class="order-confirmation__status" role="status">Loading your order.</p>
  } @else if (unreachable()) {
    <h1 class="order-confirmation__heading">Order</h1>
    <p class="order-confirmation__status" role="status">
      Your order could not be loaded. Start the mock server on port 4000 and try again.
    </p>
  } @else if (order(); as placedOrder) {
    <h1 class="order-confirmation__heading">Thank you for your order</h1>

    <p class="order-confirmation__status" role="status">
      Order {{ placedOrder.number }} was placed on {{ placedOrder.placedAt }} and is
      {{ placedOrder.status }}.
    </p>

    <table class="order-confirmation__table">
      <caption class="order-confirmation__caption">
        What you ordered
      </caption>
      <thead>
        <tr>
          <th scope="col">Product</th>
          <th scope="col">Unit price</th>
          <th scope="col">Quantity</th>
          <th scope="col">Line total</th>
        </tr>
      </thead>
      <tbody>
        @for (line of placedOrder.lines; track line.productName) {
          <tr>
            <th scope="row">{{ line.productName }}</th>
            <td>{{ line.unitPrice | money }}</td>
            <td>{{ line.quantity }}</td>
            <td>{{ line.lineTotal | money }}</td>
          </tr>
        }
      </tbody>
    </table>

    <dl class="order-confirmation__summary">
      <dt>Subtotal</dt>
      <dd>{{ placedOrder.subtotal | money }}</dd>

      @if (placedOrder.promotionCode !== null) {
        <dt>Promotion code</dt>
        <dd>{{ placedOrder.promotionCode }}</dd>

        <dt>Discount</dt>
        <dd>{{ placedOrder.discount | money }}</dd>
      }

      <dt>Shipping</dt>
      <dd>{{ placedOrder.shipping | money }}</dd>

      <dt class="order-confirmation__total-term">Total</dt>
      <dd class="order-confirmation__total-value">{{ placedOrder.total | money }}</dd>
    </dl>

    <a class="button" [routerLink]="['/']">Back to the catalogue</a>
    <a class="order-confirmation__account" [routerLink]="['/account']">See your order history</a>
  } @else {
    <h1 class="order-confirmation__heading">Order not found</h1>
    <p class="order-confirmation__status" role="status">
      No order with that address belongs to you.
    </p>
    <a class="button" [routerLink]="['/account']">Go to your account</a>
  }
</section>
```

### `src/app/order-confirmation/order-confirmation.component.scss`



```scss
.order-confirmation {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__status {
    color: #4b5563;
    margin-bottom: 1rem;
  }

  &__table {
    width: 100%;
    max-width: 44rem;
    border-collapse: collapse;
    margin-bottom: 1.5rem;

    th,
    td {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
  }

  &__caption {
    text-align: left;
    padding-bottom: 0.5rem;
    color: #4b5563;
  }

  &__summary {
    display: grid;
    grid-template-columns: minmax(0, 12rem) minmax(0, 1fr);
    gap: 0.5rem 1rem;
    max-width: 32rem;
    margin-bottom: 1.5rem;

    dt {
      color: #4b5563;
    }
  }

  &__total-term,
  &__total-value {
    font-weight: 700;
    font-size: 1.125rem;
  }

  &__account {
    display: inline-block;
    margin-left: 1rem;
    text-decoration: underline;
  }
}
```

## The account

### `src/app/account/session-marker.ts`

The browser's own note that it has a session open. It holds the word `open` and nothing else, and it is the reason a first visit makes no refresh request and a visitor whose session was ended somewhere else is told so.

```ts
import { DOCUMENT, inject, Injectable } from '@angular/core';

const cookieName = 'zappy_session';

@Injectable({ providedIn: 'root' })
export class SessionMarker {
  private readonly document = inject(DOCUMENT);

  present(): boolean {
    return this.document.cookie
      .split(';')
      .some((entry) => entry.trim().startsWith(`${cookieName}=`));
  }

  remember(): void {
    this.write('open', 'max-age=2592000');
  }

  forget(): void {
    this.write('', 'max-age=0');
  }

  private write(value: string, lifetime: string): void {
    const secure = this.document.location.protocol === 'https:' ? '; secure' : '';
    this.document.cookie = `${cookieName}=${value}; path=/; samesite=lax; ${lifetime}${secure}`;
  }
}
```

### `src/app/account/signed-in.guard.ts`

The checkout, the confirmation and the account belong to a customer. A visitor without a session is sent to `/login` with the way back in the url.

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const signedInGuard: CanActivateFn = (route, state) => {
  if (inject(SessionService).signedIn()) {
    return true;
  }

  return inject(Router).createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
};
```

### `src/app/account/session.service.ts`

Registration, login, logout, revoking a session and the customer read. Revoking the session the request is made from is allowed, and the answer says so by no longer carrying a current session, which is when the application throws its token away and empties the Apollo cache.

```ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AccessTokenStore } from '../api/access-token-store';
import {
  AuthenticationFragment,
  CurrentCustomerDocument,
  LoginDocument,
  LoginInput,
  LoginMutation,
  LoginMutationVariables,
  LogoutDocument,
  LogoutMutation,
  LogoutMutationVariables,
  RegisterDocument,
  RegisterInput,
  RegisterMutation,
  RegisterMutationVariables,
  RevokeSessionDocument,
  RevokeSessionMutation,
  RevokeSessionMutationVariables,
} from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { SessionRefresher } from '../api/session-refresher';
import { UserError } from '../api/user-error';
import { SessionMarker } from './session-marker';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly apollo = inject(Apollo);
  private readonly accessTokenStore = inject(AccessTokenStore);
  private readonly sessionRefresher = inject(SessionRefresher);
  private readonly sessionMarker = inject(SessionMarker);

  private readonly customerQuery = graphqlResource(CurrentCustomerDocument, () =>
    this.accessTokenStore.signedIn() ? {} : undefined
  );

  private readonly endedElsewhere = signal(false);

  readonly signedIn = this.accessTokenStore.signedIn;
  readonly loading = this.customerQuery.isLoading;
  readonly customer = computed(() => this.customerQuery.value()?.me ?? null);
  readonly sessions = computed(() => this.customer()?.sessions ?? []);
  readonly sessionEnded = this.endedElsewhere.asReadonly();

  async restore(): Promise<void> {
    if (!this.sessionMarker.present()) {
      return;
    }

    const refreshed = await firstValueFrom(this.sessionRefresher.refresh());

    if (!refreshed) {
      this.sessionMarker.forget();
      this.endedElsewhere.set(true);
    }
  }

  async register(input: RegisterInput): Promise<UserError[]> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RegisterMutation, RegisterMutationVariables>({
        mutation: RegisterDocument,
        variables: { input },
      })
    );

    return this.acceptAuthentication(answer.data?.register);
  }

  async logIn(input: LoginInput): Promise<UserError[]> {
    this.endedElsewhere.set(false);

    const answer = await firstValueFrom(
      this.apollo.mutate<LoginMutation, LoginMutationVariables>({
        mutation: LoginDocument,
        variables: { input },
      })
    );

    return this.acceptAuthentication(answer.data?.login);
  }

  async logOut(): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate<LogoutMutation, LogoutMutationVariables>({ mutation: LogoutDocument })
    );

    await this.forgetCustomer();
  }

  async revokeSession(sessionId: string): Promise<UserError[]> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RevokeSessionMutation, RevokeSessionMutationVariables>({
        mutation: RevokeSessionDocument,
        variables: { sessionId },
      })
    );

    const payload = answer.data?.revokeSession;

    if (payload === undefined) {
      throw new Error('The store API answered without a session payload.');
    }

    if (payload.errors.length > 0) {
      return payload.errors;
    }

    if (payload.sessions.some((session) => session.current)) {
      this.customerQuery.reload();
      return payload.errors;
    }

    await this.forgetCustomer();
    return payload.errors;
  }

  private acceptAuthentication(payload: AuthenticationFragment | undefined): UserError[] {
    if (payload === undefined) {
      throw new Error('The store API answered without an authentication payload.');
    }

    if (payload.accessToken === null) {
      return payload.errors;
    }

    this.accessTokenStore.hold(payload.accessToken, payload.accessTokenExpiresAt);
    this.sessionMarker.remember();
    this.endedElsewhere.set(false);

    return payload.errors;
  }

  private async forgetCustomer(): Promise<void> {
    this.accessTokenStore.release();
    this.sessionMarker.forget();
    await this.apollo.client.clearStore();
  }
}
```

### `src/app/account/account.component.ts`



```ts
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { attempt } from '../api/attempt';
import { OrdersDocument } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { UserError } from '../api/user-error';
import { SessionService } from './session.service';

const orderPageSize = 10;

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
  imports: [RouterLink, MoneyPipe, UserErrorsComponent],
})
export class AccountComponent {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly signedIn = this.sessionService.signedIn;
  protected readonly customer = this.sessionService.customer;
  protected readonly sessions = this.sessionService.sessions;
  protected readonly errors = signal<UserError[]>([]);
  protected readonly problem = signal<string | null>(null);

  private readonly ordersQuery = graphqlResource(OrdersDocument, () =>
    this.signedIn() ? { first: orderPageSize } : undefined
  );

  protected readonly loadingOrders = this.ordersQuery.isLoading;
  protected readonly orders = computed(
    () => this.ordersQuery.value()?.orders.edges.map((edge) => edge.node) ?? []
  );
  protected readonly orderCount = computed(() => this.ordersQuery.value()?.orders.totalCount ?? 0);

  protected async revokeSession(sessionId: string): Promise<void> {
    const answered = await attempt(
      () => this.sessionService.revokeSession(sessionId),
      this.problem
    );

    this.errors.set(answered ?? []);

    if (!this.signedIn()) {
      await this.router.navigate(['/login']);
    }
  }

  protected async logOut(): Promise<void> {
    await attempt(() => this.sessionService.logOut(), this.problem);
    this.errors.set([]);
    await this.router.navigate(['/login']);
  }
}
```

### `src/app/account/account.component.html`



```html
<section class="account container">
  <h1 class="account__heading">Your account</h1>

  <app-user-errors [errors]="errors()" [problem]="problem()" />

  @if (customer(); as signedInCustomer) {
    <p class="account__status" role="status">
      Logged in as {{ signedInCustomer.name }} ({{ signedInCustomer.email }}).
    </p>
  }

  <button class="button button--quiet" type="button" (click)="logOut()">Log out</button>

  <h2 class="account__section-heading">Order history</h2>

  @if (loadingOrders()) {
    <p class="account__status" role="status">Loading your orders.</p>
  } @else if (orderCount() === 0) {
    <p class="account__status" role="status">You have not placed an order yet.</p>
    <a class="button" [routerLink]="['/']">Back to the catalogue</a>
  } @else {
    <table class="account__table">
      <caption class="account__caption">
        Your orders, newest first
      </caption>
      <thead>
        <tr>
          <th scope="col">Order</th>
          <th scope="col">Placed</th>
          <th scope="col">Status</th>
          <th scope="col">Total</th>
          <th scope="col">Details</th>
        </tr>
      </thead>
      <tbody>
        @for (order of orders(); track order.id) {
          <tr>
            <th scope="row">{{ order.number }}</th>
            <td>{{ order.placedAt }}</td>
            <td>{{ order.status }}</td>
            <td>{{ order.total | money }}</td>
            <td>
              <a [routerLink]="['/orders', order.id]">See order {{ order.number }}</a>
            </td>
          </tr>
        }
      </tbody>
    </table>
  }

  <section class="account__sessions-panel" aria-labelledby="account-open-sessions">
    <h2 class="account__section-heading" id="account-open-sessions">Open sessions</h2>

    <ul class="account__sessions">
      @for (session of sessions(); track session.id) {
        <li class="account__session">
          <span class="account__session-device">
            {{ session.device }}
            @if (session.current) {
              <span class="account__session-current">(this device)</span>
            }
          </span>
          <span class="account__session-times">
            Logged in {{ session.createdAt }}, last used {{ session.lastUsedAt }}
          </span>
          @if (!session.current) {
            <button class="button button--quiet" type="button" (click)="revokeSession(session.id)">
              Revoke {{ session.device }}
            </button>
          }
        </li>
      }
    </ul>
  </section>
</section>
```

### `src/app/account/account.component.scss`



```scss
.account {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__section-heading {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 2rem 0 0.75rem;
  }

  &__status {
    color: #4b5563;
    margin-bottom: 1rem;
  }

  &__table {
    width: 100%;
    max-width: 48rem;
    border-collapse: collapse;

    th,
    td {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    a {
      text-decoration: underline;
    }
  }

  &__caption {
    text-align: left;
    padding-bottom: 0.5rem;
    color: #4b5563;
  }

  &__sessions {
    list-style: none;
    padding: 0;
    max-width: 48rem;
  }

  &__session {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  &__session-device {
    font-weight: 600;
    min-width: 14rem;
  }

  &__session-current {
    margin-left: 0.5rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: #d1fae5;
    color: #065f46;
    font-size: 0.75rem;
    font-weight: 600;
  }

  &__session-times {
    color: #4b5563;
    font-size: 0.875rem;
    flex: 1 1 16rem;
  }
}
```

## Logging in and registering

### `src/app/login/login.component.ts`

The login screen. `returnTo` comes from the url through the same component input binding the catalogue uses, and the notice is the contract's own `SESSION_INVALID` sentence rather than a new one.

```ts
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginFormComponent } from '../../shared/components/login-form/login-form.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { SessionService } from '../account/session.service';
import { userErrorMessage } from '../api/user-error';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [RouterLink, LoginFormComponent, UserErrorsComponent],
})
export class LoginComponent {
  private readonly sessionService = inject(SessionService);

  readonly returnTo = input<string | null>(null);

  protected readonly sessionEndedNote = computed(() =>
    this.sessionService.sessionEnded() ? userErrorMessage('SESSION_INVALID') : null
  );
}
```

### `src/app/login/login.component.html`



```html
<section class="login container">
  <h1 class="login__heading">Log in</h1>

  <app-user-errors [note]="sessionEndedNote()" />

  <app-login-form mode="login" [returnTo]="returnTo()" />

  <p class="login__alternative">
    No account yet?
    <a [routerLink]="['/register']">Register</a>
  </p>
</section>
```

### `src/app/login/login.component.scss`



```scss
.login {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__alternative {
    margin-top: 1rem;
    color: #4b5563;

    a {
      text-decoration: underline;
    }
  }
}
```

### `src/app/register/register.component.ts`

The registration screen. It is the same form in its other mode, so the rules and the copy exist once.

```ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginFormComponent } from '../../shared/components/login-form/login-form.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  imports: [RouterLink, LoginFormComponent],
})
export class RegisterComponent {}
```

### `src/app/register/register.component.html`



```html
<section class="register container">
  <h1 class="register__heading">Register</h1>

  <app-login-form mode="register" />

  <p class="register__alternative">
    Already registered?
    <a [routerLink]="['/login']">Log in</a>
  </p>
</section>
```

### `src/app/register/register.component.scss`



```scss
.register {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__alternative {
    margin-top: 1rem;
    color: #4b5563;

    a {
      text-decoration: underline;
    }
  }
}
```

## The chrome

### `src/app/header/header.component.ts`

The two menu links, the cart count, the account link and the wishlist button. The active link comes from the router's `isActive` signal, matched exactly so the catalogue link is not active on every screen.

```ts
import { Component, computed, inject } from '@angular/core';
import { isActive, Router, RouterLink } from '@angular/router';
import { WishlistService } from '../../shared/services/wishlist.service';
import { SessionService } from '../account/session.service';
import { CartService } from '../cart/cart.service';
import { WishlistDrawerService } from '../wishlist-drawer/wishlist-drawer.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [RouterLink],
})
export default class HeaderComponent {
  private readonly router = inject(Router);
  private readonly wishlistDrawerService = inject(WishlistDrawerService);

  readonly count = inject(WishlistService).count;
  readonly itemCount = inject(CartService).itemCount;
  readonly signedIn = inject(SessionService).signedIn;

  readonly cartLabel = computed(
    () => `Cart, ${this.itemCount()} ${this.itemCount() === 1 ? 'item' : 'items'}`
  );
  readonly wishlistLabel = computed(() => `Wishlist, ${this.count()} saved`);

  readonly menuLinks = [
    { path: '/', label: 'Catalogue' },
    { path: '/about', label: 'About' },
  ].map((menuLink) => ({
    ...menuLink,
    isActive: isActive(menuLink.path, this.router, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    }),
  }));

  openDrawer(): void {
    this.wishlistDrawerService.toggle();
  }
}
```

### `src/app/header/header.component.html`



```html
<div class="container desktop-navbar__container">
  <div class="desktop-navbar__logo-link">
    <a routerLink="/" aria-label="Zappy Mart home">
      <img src="assets/logo_zappy_mart.png" width="200" height="60" alt="Zappy Mart" />
    </a>
  </div>

  <nav class="desktop-navbar__nav" aria-label="Main">
    <ul class="desktop-navbar__menu">
      @for (link of menuLinks; track link.path) {
        <li class="desktop-navbar__menu-item" [attr.data-active]="link.isActive()">
          <a class="desktop-navbar__link" [routerLink]="link.path">
            {{ link.label }}
          </a>
        </li>
      }
    </ul>
  </nav>

  <div class="desktop-navbar__actions">
    <a class="desktop-navbar__action" routerLink="/cart" [attr.aria-label]="cartLabel()">
      Cart
      @if (itemCount() > 0) {
        <span class="cart-count-badge">{{ itemCount() }}</span>
      }
    </a>

    @if (signedIn()) {
      <a class="desktop-navbar__action" routerLink="/account">Account</a>
    } @else {
      <a class="desktop-navbar__action" routerLink="/login">Log in</a>
    }

    <button
      class="desktop-navbar__check-wish-list"
      type="button"
      [attr.aria-label]="wishlistLabel()"
      (click)="openDrawer()"
      [disabled]="count() === 0"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="desktop-navbar__icon"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>

      @if (count() > 0) {
        <span class="wishlist-count-badge">{{ count() }}</span>
      }
    </button>
  </div>
</div>
```

### `src/app/header/header.component.scss`



```scss
.desktop-navbar {
  &__container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    height: 100%;
  }

  &__logo-link {
    display: inline-block;
    line-height: 0;

    height: 48px;
    width: auto;

    img {
      height: 48px;
      display: block;
      width: auto;
    }
  }

  &__nav {
    display: flex;
  }

  &__menu {
    display: flex;
    padding: 0;
    margin: 0;
  }

  &__menu-item {
    list-style: none;
    display: inline-block;
    margin: 0.5rem;
    padding: 0.5rem;

    &:hover {
      background-color: rgba(39, 95, 180, 0.2);
      border-radius: 0.25rem;
    }

    &[data-active='true'] a::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -0.5rem;
      height: 2px;
      width: 100%;
      background-color: rgb(66, 0, 128);
    }
  }

  &__link {
    position: relative;
    text-decoration: none;
    color: black;
    font-size: 1.125rem;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__action {
    position: relative;
    font-weight: 600;

    .cart-count-badge {
      display: inline-block;
      margin-left: 0.25rem;
      background-color: #111827;
      color: white;
      border-radius: 9999px;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: bold;
    }
  }

  &__check-wish-list {
    color: rgba(13, 27, 13, 0.4);
    background: rgba(199, 130, 187, 0.144);
    border: none;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    position: relative;

    &:hover:not(:disabled) {
      background: rgba(201, 110, 145, 0.226);
    }

    .wishlist-count-badge {
      position: absolute;
      top: -0.5rem;
      right: -0.5rem;
      background-color: red;
      color: white;
      border-radius: 9999px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: bold;
    }
  }

  &__icon {
    width: 20px;
    display: block;
  }
}
```

### `src/app/wishlist-drawer/wishlist-drawer.service.ts`

Open or closed. The one piece of client state that is nobody else's business.

```ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishlistDrawerService {
  private readonly currentlyOpen = signal(false);
  readonly isOpen = this.currentlyOpen.asReadonly();

  open(): void {
    this.currentlyOpen.set(true);
  }

  close(): void {
    this.currentlyOpen.set(false);
  }

  toggle(): void {
    this.currentlyOpen.update((open) => !open);
  }
}
```

### `src/app/wishlist-drawer/wishlist-drawer.component.ts`



```ts
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { WishlistService } from '../../shared/services/wishlist.service';
import { attempt } from '../api/attempt';
import { WishlistDrawerService } from './wishlist-drawer.service';

@Component({
  selector: 'app-wishlist-drawer',
  templateUrl: './wishlist-drawer.component.html',
  styleUrl: './wishlist-drawer.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent, UserErrorsComponent],
})
export class WishlistDrawerComponent {
  private readonly wishlistDrawerService = inject(WishlistDrawerService);
  private readonly wishlistService = inject(WishlistService);

  protected readonly products = this.wishlistService.products;
  protected readonly problem = signal<string | null>(null);

  protected closeDrawer(): void {
    this.wishlistDrawerService.close();
  }

  protected async remove(productId: string): Promise<void> {
    await attempt(() => this.wishlistService.remove(productId), this.problem);
  }
}
```

### `src/app/wishlist-drawer/wishlist-drawer.component.html`



```html
<div class="wishlist-drawer">
  <button
    class="wishlist-drawer__overlay"
    type="button"
    aria-label="Close your wishlist"
    (click)="closeDrawer()"
    (keydown.escape)="closeDrawer()"
  ></button>

  <aside class="wishlist-drawer__content" aria-label="Your wishlist">
    <button class="wishlist-drawer__close" type="button" (click)="closeDrawer()">
      Close your wishlist
    </button>

    <h2 class="wishlist-drawer__title">Your wishlist</h2>

    <app-user-errors [problem]="problem()" />

    @if (products().length === 0) {
      <p class="wishlist-drawer__empty" role="status">You have not saved a product yet.</p>
    } @else {
      <ul class="wishlist-drawer__list">
        @for (product of products(); track product.id) {
          <li class="wishlist-drawer__item">
            <app-product-image
              [imageUrl]="product.imageUrl"
              [name]="product.name"
              size="small"
              [decorative]="true"
            />
            <a
              class="wishlist-drawer__name"
              [routerLink]="['/product', product.slug]"
              (click)="closeDrawer()"
            >
              {{ product.name }}
            </a>
            <span class="wishlist-drawer__price">{{ product.price | money }}</span>
            <button
              class="wishlist-drawer__remove"
              type="button"
              (click)="remove(product.id)"
            >
              Remove {{ product.name }}
            </button>
          </li>
        }
      </ul>
    }
  </aside>
</div>
```

### `src/app/wishlist-drawer/wishlist-drawer.component.scss`



```scss
.wishlist-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 100;
  height: 100%;
  width: 100%;

  &__overlay {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background-color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }

  &__content {
    position: absolute;
    top: 0;
    right: 0;
    width: 22rem;
    max-width: 100%;
    height: 100%;
    background: white;
    padding: 1rem;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
    overflow-y: auto;
  }

  &__close {
    float: right;
    background: none;
    border: none;
    padding: 0;
    color: #2563eb;
    text-decoration: underline;
    font: inherit;
    cursor: pointer;
  }

  &__title {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.25rem;
    font-weight: 600;
  }

  &__empty {
    color: #4b5563;
  }

  &__list {
    list-style: none;
    padding: 0;
  }

  &__item {
    display: grid;
    grid-template-columns: 3.5rem minmax(0, 1fr);
    gap: 0.25rem 0.75rem;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  &__name {
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: underline;
  }

  &__price {
    grid-column: 2;
    font-size: 0.875rem;
    color: #059669;
    font-weight: 600;
  }

  &__remove {
    grid-column: 2;
    justify-self: start;
    background: none;
    border: none;
    padding: 0;
    color: #b91c1c;
    text-decoration: underline;
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }
}
```

### `src/app/about/about.component.ts`

The Dutch `over-ons` page, translated and moved to `/about`, because the house rule is one language for the copy and this store front is in English.

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {}
```

### `src/app/about/about.component.html`



```html
<section class="about container">
  <h1 class="about__heading">About Zappy Mart</h1>

  <p class="about__paragraph">
    Zappy Mart is one small web store built several times over, so that a reader can open a
    working application for every stack the articles explain, read it end to end, and build it
    themselves.
  </p>

  <p class="about__paragraph">
    This is the Angular store front. It is a single page application that calls the GraphQL API
    directly. It keeps the access token in memory only and refreshes it through a cookie the API
    sets, so a reload never leaves a token behind in the browser.
  </p>

  <p class="about__paragraph">
    Every store front in the family serves the same six screens from the same contract: the
    catalogue, one product, the cart, the checkout, the order confirmation, and the account with
    the order history and the sessions.
  </p>
</section>
```

### `src/app/about/about.component.scss`



```scss
.about {
  padding-top: 1.5rem;
  padding-bottom: 3rem;

  &__heading {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__paragraph {
    max-width: 44rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }
}
```

## The shell

### `src/main.ts`

The providers moved out of the bootstrap call into `app.config.ts`, which is where a reader looks for them.

```ts
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((error) => console.error(error));
```

### `src/app/app.config.ts`

`withComponentInputBinding` is what makes the url a signal input on the screens. `provideAppInitializer` is the one refresh that restores a session before the first screen renders.

```ts
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { environment } from '../environments/environment';
import { SessionService } from './account/session.service';
import { authenticationInterceptor } from './api/authentication.interceptor';
import { GRAPHQL_URL } from './api/graphql-url';
import { provideStoreApiClient } from './api/store-api-client';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withXhr(), withInterceptors([authenticationInterceptor])),
    { provide: GRAPHQL_URL, useValue: environment.graphqlUrl },
    provideStoreApiClient(),
    provideAppInitializer(() => inject(SessionService).restore()),
  ],
};
```

### `src/app/app.routes.ts`



```ts
import { Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { AccountComponent } from './account/account.component';
import { signedInGuard } from './account/signed-in.guard';
import { CartComponent } from './cart/cart.component';
import { CatalogueComponent } from './catalogue/catalogue.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { LoginComponent } from './login/login.component';
import { OrderConfirmationComponent } from './order-confirmation/order-confirmation.component';
import { ProductComponent } from './product/product.component';
import { RegisterComponent } from './register/register.component';

export const routes: Routes = [
  {
    path: '',
    component: CatalogueComponent,
    title: 'Catalogue | Zappy Mart',
  },
  {
    path: 'product/:slug',
    component: ProductComponent,
    title: 'Product | Zappy Mart',
  },
  {
    path: 'cart',
    component: CartComponent,
    title: 'Cart | Zappy Mart',
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [signedInGuard],
    title: 'Checkout | Zappy Mart',
  },
  {
    path: 'orders/:orderId',
    component: OrderConfirmationComponent,
    canActivate: [signedInGuard],
    title: 'Your order | Zappy Mart',
  },
  {
    path: 'account',
    component: AccountComponent,
    canActivate: [signedInGuard],
    title: 'Your account | Zappy Mart',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Log in | Zappy Mart',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Register | Zappy Mart',
  },
  {
    path: 'about',
    component: AboutComponent,
    title: 'About | Zappy Mart',
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
```

### `src/app/app.component.ts`

The drawer moved from the home page to the shell, so the wishlist opens on every screen.

```ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import HeaderComponent from './header/header.component';
import { WishlistDrawerComponent } from './wishlist-drawer/wishlist-drawer.component';
import { WishlistDrawerService } from './wishlist-drawer/wishlist-drawer.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [HeaderComponent, RouterOutlet, WishlistDrawerComponent],
})
export class AppComponent {
  readonly drawerOpen = inject(WishlistDrawerService).isOpen;
}
```

### `src/app/app.component.html`



```html
<app-header />

<main>
  <router-outlet />
</main>

@if (drawerOpen()) {
  <app-wishlist-drawer />
}
```

### `src/styles.scss`

The file keeps everything it had and gains three blocks the screens share. Only the addition is shown.

```scss
.button {
  display: inline-block;
  padding: 0.5rem 1rem;
  border: 1px solid #111827;
  border-radius: 0.375rem;
  background: #111827;
  color: #ffffff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-align: center;

  &:hover:not(:disabled) {
    background: #1f2937;
  }

  &:disabled {
    background: #9ca3af;
    border-color: #9ca3af;
    cursor: not-allowed;
  }

  &--quiet {
    background: #ffffff;
    color: #111827;

    &:hover:not(:disabled) {
      background: #f3f4f6;
    }
  }
}

.field {
  margin-bottom: 0.75rem;

  &__label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 600;
    font-size: 0.875rem;
  }

  &__input {
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 1px solid #9ca3af;
    border-radius: 0.375rem;
    font: inherit;
  }

  &__hint {
    margin-top: 0.25rem;
    font-size: 0.8125rem;
    color: #4b5563;
  }
}

main {
  display: block;
}
```

## The tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

A passing run prints:

```
Test Suites: 22 passed, 22 total
Tests:       112 passed, 112 total
Snapshots:   0 total
```

Every screen has a test that drives it the way a visitor does, and every one of them
finds its elements by role and by accessible name, never by a class and never by an id
put in the markup for the test. `src/testing/roles.ts` is the whole of that: a map from
a role to the elements that carry it, and a filter on the accessible name.

That rule is not decoration. A test that asks for the button named "Add to cart" fails
when the button loses its name, which is the same failure a visitor with a screen reader
meets. The role queries and the `templateAccessibility` rules of angular-eslint keep the
markup honest from two sides.

The screens whose resource lives in the component are tested against
`HttpTestingController`, so the real request is built, the real answer is parsed and the
real template renders it. The screens that read through a service are given a stand in
for that service. No test reaches the network and no test needs a running mock server.

`jest.config.js` lost `fakeTimers: { enableGlobally: true }` in this item. Zoneless change
detection settles on a real task, so `fixture.whenStable()` never resolves under fake
timers. No test in the folder used them.

## The end to end suite

`tools/end-to-end/` is the shared Playwright suite. The React Router item owns that
folder and nothing here changes it. This store front passes it.

Three terminals. The mock server first, then this application, then the suite:

```bash
cd tools/mock-server
node server.mjs

cd frontends/angular
npm start

cd tools/end-to-end
FRONTEND_URL=http://localhost:4200 GRAPHQL_URL=http://localhost:4000/graphql RESET_SEED=true \
  npx playwright test --grep-invert "@progressive-enhancement" --reporter=line
```

A passing run prints:

```
Running 3 tests using 1 worker

[1/3] [chromium] > tests\catalogueToPlacedOrder.spec.ts:13:1 > a visitor filters the catalogue, fills a cart, uses a promotion code and places an order
[2/3] [chromium] > tests\sessionsAndReplay.spec.ts:24:1 > a customer registers, logs in twice, revokes the other session and cannot replay a dead one
[3/3] [chromium] > tests\storeFrontIsUp.spec.ts:4:1 > the catalogue answers with products, a filter and the shop chrome
  3 passed (7.0s)
```

`withoutJavaScript.spec.ts` is left out with `--grep-invert "@progressive-enhancement"`.
A single page application has nothing to render before its script runs, which is the one
thing this shape gives up against the two server rendered store fronts, and the suite
says so in its own tag.

`npm start` is `ng serve`, which binds to `http://localhost:4200`. For a run against the
production bundle instead, `npm run build` writes `dist/zappy-mart-frontend/browser`,
which any static server can serve as long as every path falls back to `index.html`.

### The four decisions the suite settled

`tools/end-to-end/README.md`, section "The names the store front has to use", is the
authority for every name below. Four of them were open when this store front was first
written, and this is where each landed on 9 September 2026:

| Decision | What this store front does |
|---|---|
| The wishlist stays a drawer | The header button is named `Wishlist, <count> saved`, and the suite accepts a link or a button of that name |
| Logging in and registering are screens | `/login` under an `h1` `Log in` and `/register` under an `h1` `Register`, both rendering one `LoginFormComponent`. `/checkout`, `/orders/<id>` and `/account` are behind `signedInGuard`, which sends a signed out visitor to `/login?returnTo=<where they were going>` and back again after the login |
| The promotion code lives on the checkout | Textbox `Promotion code` and button `Apply code` on `/checkout`, with `WELCOME10 takes off €1.97.` under it. The cart keeps the applied code in its summary and no longer carries the form |
| The account lists the open sessions | A `section` labelled by its `Open sessions` heading, one list item per session, `(this device)` on the current one and a button `Revoke <device>` on every other one |

Two smaller things came with them. The catalogue filter gained the checkbox
`In stock only`, which is `ProductFilter.inStockOnly` in the contract and rides in the
url as `?stock=available`. And the cart line became a small form with a spinbutton and an
`Update` button rather than a field that saves itself on blur.

### The cookie that is not a token

The account journey ends by replaying a dead session: it takes every cookie the browser
holds while signed in, logs out, puts them all back and asks for `/account` again. The
store has to refuse them.

The Angular shape holds its access token in memory and nothing else, so what a replay
puts back is the API's own `zappy_refresh` and `zappy_cart` cookies plus one cookie of
this application's own, `zappy_session`, which holds the word `open`. It says what it is:
this browser has a session open. It is not a token, it is not httpOnly and it grants
nothing. `SessionService.restore` reads it, and that changed two things for the better:

- A visitor with no marker makes **no** refresh request at all, so a first visit is one
  request lighter than it was.
- A visitor with a marker whose refresh is refused is told why. The session was ended
  somewhere else, so `/login` shows the alert `Your session has ended. Please log in
  again.`, which is `userErrorMessage('SESSION_INVALID')` and no new sentence.

Replaying the cookies after a logout therefore lands exactly where the suite asks: the
marker says a session was open, the refresh of the dead token fails, the marker is thrown
away and the visitor reads that same alert.

## The test files

### `src/testing/roles.ts`

The role queries. Not a test itself, and not part of the application bundle.

```ts
const selectorByRole: Record<string, string> = {
  alert: '[role="alert"]',
  button: 'button, [role="button"]',
  caption: 'caption, [role="caption"]',
  cell: 'td, [role="cell"]',
  checkbox: 'input[type="checkbox"], [role="checkbox"]',
  columnheader: 'th[scope="col"], [role="columnheader"]',
  combobox: 'select, [role="combobox"]',
  form: 'form[aria-label], form[aria-labelledby], [role="form"]',
  heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  img: 'img[alt]:not([alt=""]), [role="img"]',
  link: 'a[href], [role="link"]',
  list: 'ul, ol, [role="list"]',
  listitem: 'li, [role="listitem"]',
  navigation: 'nav, [role="navigation"]',
  region: 'section[aria-label], section[aria-labelledby], aside[aria-label], [role="region"]',
  row: 'tr, [role="row"]',
  rowheader: 'th[scope="row"], [role="rowheader"]',
  searchbox: 'input[type="search"], [role="searchbox"]',
  spinbutton: 'input[type="number"], [role="spinbutton"]',
  status: '[role="status"], output',
  table: 'table, [role="table"]',
  textbox:
    'input[type="text"], input[type="email"], input[type="password"], textarea, [role="textbox"]',
};

const formControls = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

function labelText(element: Element): string {
  if (element.id === '') {
    return '';
  }

  const root = element.getRootNode() as Document | ShadowRoot;
  const label = root.querySelector(`label[for="${element.id}"]`);

  return label?.textContent ?? '';
}

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function labelledByText(element: Element): string {
  const labelledBy = element.getAttribute('aria-labelledby');

  if (labelledBy === null) {
    return '';
  }

  const root = element.getRootNode() as Document | ShadowRoot;

  return labelledBy
    .split(/\s+/)
    .map((identifier) => root.querySelector(`#${identifier}`)?.textContent ?? '')
    .join(' ');
}

function accessibleName(element: Element): string {
  const ariaLabel = element.getAttribute('aria-label');

  if (ariaLabel !== null) {
    return tidy(ariaLabel);
  }

  const labelledBy = labelledByText(element);

  if (labelledBy !== '') {
    return tidy(labelledBy);
  }

  if (formControls.has(element.tagName)) {
    return tidy(labelText(element));
  }

  return tidy(element.textContent ?? '');
}

export function allByRole(root: Element, role: string, name?: string | RegExp): HTMLElement[] {
  const selector = selectorByRole[role];

  if (selector === undefined) {
    throw new Error(`No selector is mapped for the role "${role}".`);
  }

  const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));

  if (name === undefined) {
    return matches;
  }

  return matches.filter((element) => {
    const found = accessibleName(element);
    return typeof name === 'string' ? found === name : name.test(found);
  });
}

export function byRole(root: Element, role: string, name?: string | RegExp): HTMLElement {
  const matches = allByRole(root, role, name);

  if (matches.length === 0) {
    const named = name === undefined ? '' : ` named "${String(name)}"`;
    throw new Error(`No element with the role "${role}"${named} was found.`);
  }

  return matches[0];
}

export function queryByRole(
  root: Element,
  role: string,
  name?: string | RegExp
): HTMLElement | null {
  return allByRole(root, role, name)[0] ?? null;
}
```

### `src/app/catalogue/catalogue.component.spec.ts`

The catalogue screen, driven the way a visitor drives it.

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WishlistService } from '../../shared/services/wishlist.service';
import { byRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { CartService } from '../cart/cart.service';
import { CatalogueComponent } from './catalogue.component';

const graphqlUrl = 'http://localhost:4000/graphql';

const jacket = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: '/images/products/mens-cotton-jacket.svg',
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

const catalogueAnswer = {
  data: {
    categories: [
      { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
      { id: 'category-electronics', name: 'Electronics', slug: 'electronics' },
    ],
    products: {
      totalCount: 1,
      pageInfo: { hasNextPage: false, endCursor: 'cursor-1' },
      edges: [{ cursor: 'cursor-1', node: jacket }],
    },
  },
};

describe('CatalogueComponent', () => {
  let fixture: ComponentFixture<CatalogueComponent>;
  let httpTestingController: HttpTestingController;
  let addProduct: jest.Mock;
  let toggleWishlist: jest.Mock;

  beforeEach(async () => {
    addProduct = jest.fn().mockResolvedValue({ cart: null, availableStock: null, errors: [] });
    toggleWishlist = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [CatalogueComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        { provide: CartService, useValue: { addProduct, itemCount: computed(() => 0) } },
        {
          provide: WishlistService,
          useValue: {
            products: signal([]),
            count: computed(() => 0),
            contains: () => false,
            toggle: toggleWishlist,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogueComponent);
    httpTestingController = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpTestingController.expectOne(graphqlUrl).flush(catalogueAnswer);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('shows the catalogue heading, the categories and the products of the seed', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Catalogue')).toBeTruthy();
    expect(byRole(page, 'status').textContent).toContain('1 products match');
    expect((byRole(page, 'combobox', 'Category') as HTMLSelectElement).options.length).toBe(3);
    expect(byRole(page, 'heading', 'Mens Cotton Jacket')).toBeTruthy();
  });

  it('offers an in stock only checkbox', () => {
    expect(byRole(fixture.nativeElement as HTMLElement, 'checkbox', 'In stock only')).toBeTruthy();
  });

  it('puts the search term and the category in the url when the filter is submitted', () => {
    const page = fixture.nativeElement as HTMLElement;
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const searchBox = byRole(page, 'searchbox', 'Search by name') as HTMLInputElement;
    const categoryBox = byRole(page, 'combobox', 'Category') as HTMLSelectElement;

    searchBox.value = 'jacket';
    searchBox.dispatchEvent(new Event('input'));
    categoryBox.value = 'mens-clothing';
    categoryBox.dispatchEvent(new Event('change'));
    byRole(page, 'button', 'Filter').click();

    expect(navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { category: 'mens-clothing', search: 'jacket', stock: null },
    });
  });

  it('adds a product to the cart from its card', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Add to cart').click();
    await fixture.whenStable();

    expect(addProduct).toHaveBeenCalledWith('product-03', 1);
  });

  it('saves a product to the wishlist from its card', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Save to wishlist').click();
    await fixture.whenStable();

    expect(toggleWishlist).toHaveBeenCalledWith(jacket);
  });
});
```

### `src/app/product/product.component.spec.ts`



```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WishlistService } from '../../shared/services/wishlist.service';
import { byRole, queryByRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { CartService } from '../cart/cart.service';
import { ProductComponent } from './product.component';

const graphqlUrl = 'http://localhost:4000/graphql';

const productAnswer = {
  data: {
    product: {
      id: 'product-12',
      name: 'WD 4TB Gaming Drive',
      slug: 'wd-4tb-gaming-drive',
      description: 'Expand your storage without slowing the game down.',
      stock: 1,
      imageUrl: '/images/products/wd-4tb-gaming-drive.svg',
      price: { amount: 11499, currency: 'EUR' },
      category: { id: 'category-electronics', name: 'Electronics', slug: 'electronics' },
    },
  },
};

describe('ProductComponent', () => {
  let fixture: ComponentFixture<ProductComponent>;
  let httpTestingController: HttpTestingController;
  let addProduct: jest.Mock;

  async function renderWith(answer: unknown): Promise<void> {
    fixture = TestBed.createComponent(ProductComponent);
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('slug', 'wd-4tb-gaming-drive');

    fixture.detectChanges();
    httpTestingController.expectOne(graphqlUrl).flush(answer);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    addProduct = jest.fn().mockResolvedValue({ cart: null, availableStock: null, errors: [] });

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        { provide: CartService, useValue: { addProduct, itemCount: computed(() => 0) } },
        {
          provide: WishlistService,
          useValue: {
            products: signal([]),
            count: computed(() => 0),
            contains: () => false,
            toggle: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('shows the product of the slug with its price, stock and description', async () => {
    await renderWith(productAnswer);
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'WD 4TB Gaming Drive')).toBeTruthy();
    expect(page.textContent).toContain('€114.99');
    expect(page.textContent).toContain('1 in stock');
    expect(page.textContent).toContain('Expand your storage without slowing the game down.');
  });

  it('adds the chosen quantity to the cart', async () => {
    await renderWith(productAnswer);
    const page = fixture.nativeElement as HTMLElement;
    const quantity = byRole(page, 'spinbutton') as HTMLInputElement;

    quantity.value = '2';
    quantity.dispatchEvent(new Event('input'));
    byRole(page, 'button', 'Add to cart').click();
    await fixture.whenStable();

    expect(addProduct).toHaveBeenCalledWith('product-12', 2);
  });

  it('says so when no product has that address', async () => {
    await renderWith({ data: { product: null } });
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Product not found')).toBeTruthy();
    expect(queryByRole(page, 'button', 'Add to cart')).toBeNull();
  });
});
```

### `src/app/cart/cart.component.spec.ts`



```ts
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { allByRole, byRole } from '../../testing/roles';
import { CartComponent } from './cart.component';
import { CartService } from './cart.service';

const jacket = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: '/images/products/mens-cotton-jacket.svg',
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

const line = {
  id: 'line-1',
  quantity: 2,
  lineTotal: { amount: 11198, currency: 'EUR' },
  product: jacket,
};

const filledCart = {
  id: 'cart-1',
  updatedAt: '2026-09-09T10:00:00Z',
  promotion: null,
  subtotal: { amount: 11198, currency: 'EUR' },
  shipping: { amount: 0, currency: 'EUR' },
  total: { amount: 11198, currency: 'EUR' },
  lines: [line],
};

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let cartService: {
    loading: ReturnType<typeof signal<boolean>>;
    unreachable: ReturnType<typeof signal<boolean>>;
    cart: ReturnType<typeof signal<typeof filledCart | null>>;
    changeLineQuantity: jest.Mock;
    removeLine: jest.Mock;
  };

  beforeEach(async () => {
    const cart = signal<typeof filledCart | null>(filledCart);
    const noChange = { cart: filledCart, availableStock: null, errors: [] };

    cartService = {
      loading: signal(false),
      unreachable: signal(false),
      cart,
      changeLineQuantity: jest.fn().mockResolvedValue(noChange),
      removeLine: jest.fn().mockResolvedValue(noChange),
        };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            ...cartService,
            lines: computed(() => cart()?.lines ?? []),
            empty: computed(() => (cart()?.lines.length ?? 0) === 0),
            itemCount: computed(() =>
              (cart()?.lines ?? []).reduce((count, cartLine) => count + cartLine.quantity, 0)
            ),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
  });

  it('lists the lines of the cart with the totals', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Cart')).toBeTruthy();
    expect(byRole(page, 'table')).toBeTruthy();
    expect(byRole(page, 'rowheader', /Mens Cotton Jacket/)).toBeTruthy();
    expect(byRole(page, 'link', 'Go to checkout')).toBeTruthy();
    expect(allByRole(page, 'cell').some((cell) => cell.textContent?.includes('€111.98'))).toBe(
      true
    );
  });

  it('changes the quantity of a line when its update button is used', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const quantity = byRole(page, 'spinbutton') as HTMLInputElement;

    quantity.value = '3';
    byRole(page, 'button', 'Update').click();
    await fixture.whenStable();

    expect(cartService.changeLineQuantity).toHaveBeenCalledWith('line-1', 3);
  });

  it('removes a line', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Remove Mens Cotton Jacket').click();
    await fixture.whenStable();

    expect(cartService.removeLine).toHaveBeenCalledWith('line-1');
  });

  it('says the cart is empty when it has no lines', () => {
    cartService.cart.set(null);
    fixture.detectChanges();

    expect(byRole(fixture.nativeElement as HTMLElement, 'status').textContent).toContain(
      'Your cart is empty'
    );
  });
});
```

### `src/app/checkout/checkout.component.spec.ts`



```ts
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole } from '../../testing/roles';
import { SessionService } from '../account/session.service';
import { CartService } from '../cart/cart.service';
import { CheckoutAttempt } from './checkout-attempt.service';
import { CheckoutComponent } from './checkout.component';
import { OrderService } from './order.service';

const boatNeck = {
  id: 'product-18',
  name: "MBJ Women's Solid Short Sleeve Boat Neck V",
  slug: 'mbj-womens-solid-short-sleeve-boat-neck-v',
  stock: 25,
  imageUrl: null,
  price: { amount: 985, currency: 'EUR' },
  category: { id: 'category-womens-clothing', name: "Women's clothing", slug: 'womens-clothing' },
};

const appliedPromotion = {
  code: 'WELCOME10',
  kind: 'PERCENTAGE',
  discount: { amount: 197, currency: 'EUR' },
};

const filledCart = {
  id: 'cart-1',
  updatedAt: '2026-09-09T10:00:00Z',
  promotion: null as typeof appliedPromotion | null,
  subtotal: { amount: 1970, currency: 'EUR' },
  shipping: { amount: 495, currency: 'EUR' },
  total: { amount: 2465, currency: 'EUR' },
  lines: [
    { id: 'line-1', quantity: 2, lineTotal: { amount: 1970, currency: 'EUR' }, product: boatNeck },
  ],
};

const discountedCart = {
  ...filledCart,
  promotion: appliedPromotion,
  total: { amount: 2268, currency: 'EUR' },
};

describe('CheckoutComponent', () => {
  let fixture: ComponentFixture<CheckoutComponent>;
  let cart: ReturnType<typeof signal<typeof filledCart | null>>;
  let place: jest.Mock;
  let finish: jest.Mock;
  let applyPromotionCode: jest.Mock;
  let navigate: jest.SpyInstance;

  beforeEach(async () => {
    place = jest.fn().mockResolvedValue({ order: { id: 'order-1' }, errors: [] });
    finish = jest.fn();
    cart = signal<typeof filledCart | null>(filledCart);
    applyPromotionCode = jest.fn().mockImplementation(async () => {
      cart.set(discountedCart);
      return { cart: discountedCart, availableStock: null, errors: [] };
    });

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            cart,
            lines: computed(() => cart()?.lines ?? []),
            empty: computed(() => (cart()?.lines.length ?? 0) === 0),
            itemCount: computed(() => 2),
            applyPromotionCode,
          },
        },
        {
          provide: SessionService,
          useValue: {
            signedIn: signal(true),
            customer: computed(() => ({
              id: 'customer-01',
              name: 'Jane Doe',
              email: 'jane@example.com',
            })),
          },
        },
        { provide: OrderService, useValue: { place } },
        { provide: CheckoutAttempt, useValue: { idempotencyKey: () => 'attempt-1', finish } },
      ],
    }).compileComponents();

    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
  });

  it('shows what is about to be ordered and who is ordering it', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Checkout')).toBeTruthy();
    expect(page.textContent).toContain('Jane Doe, check your order and place it.');
    expect(byRole(page, 'rowheader', "MBJ Women's Solid Short Sleeve Boat Neck V")).toBeTruthy();
    expect(page.textContent).toContain('€24.65');
  });

  it('applies a promotion code and says what it takes off', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const code = byRole(page, 'textbox', 'Promotion code') as HTMLInputElement;

    code.value = 'WELCOME10';
    code.dispatchEvent(new Event('input'));
    byRole(page, 'button', 'Apply code').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(applyPromotionCode).toHaveBeenCalledWith('WELCOME10');
    expect(page.textContent).toContain('WELCOME10 takes off €1.97.');
    expect(page.textContent).toContain('€22.68');
  });

  it('places the order with one idempotency key and goes to the confirmation', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Place order').click();
    await fixture.whenStable();

    expect(place).toHaveBeenCalledWith('attempt-1');
    expect(finish).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/orders', 'order-1']);
  });
});
```

### `src/app/order-confirmation/order-confirmation.component.spec.ts`



```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { byRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { SessionService } from '../account/session.service';
import { OrderConfirmationComponent } from './order-confirmation.component';

const graphqlUrl = 'http://localhost:4000/graphql';

const orderAnswer = {
  data: {
    order: {
      id: 'order-1',
      number: 'ZM-2026-0001',
      status: 'PAID',
      placedAt: '2026-09-09T10:05:00Z',
      promotionCode: 'WELCOME10',
      subtotal: { amount: 5599, currency: 'EUR' },
      discount: { amount: 560, currency: 'EUR' },
      shipping: { amount: 0, currency: 'EUR' },
      total: { amount: 5039, currency: 'EUR' },
      lines: [
        {
          productName: 'Mens Cotton Jacket',
          quantity: 1,
          unitPrice: { amount: 5599, currency: 'EUR' },
          lineTotal: { amount: 5599, currency: 'EUR' },
        },
      ],
    },
  },
};

describe('OrderConfirmationComponent', () => {
  let fixture: ComponentFixture<OrderConfirmationComponent>;
  let httpTestingController: HttpTestingController;

  async function renderWith(answer: unknown): Promise<void> {
    fixture = TestBed.createComponent(OrderConfirmationComponent);
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('orderId', 'order-1');

    fixture.detectChanges();
    httpTestingController.expectOne(graphqlUrl).flush(answer);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        {
          provide: SessionService,
          useValue: { signedIn: signal(true), customer: computed(() => null) },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('thanks the customer and shows the order with its totals', async () => {
    await renderWith(orderAnswer);
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Thank you for your order')).toBeTruthy();
    expect(byRole(page, 'status').textContent).toContain('ZM-2026-0001');
    expect(byRole(page, 'rowheader', 'Mens Cotton Jacket')).toBeTruthy();
    expect(page.textContent).toContain('€50.39');
  });

  it('says so when no order with that address belongs to the customer', async () => {
    await renderWith({ data: { order: null } });

    expect(byRole(fixture.nativeElement as HTMLElement, 'heading', 'Order not found')).toBeTruthy();
  });
});
```

### `src/app/account/account.component.spec.ts`



```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole, allByRole, queryByRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { AccountComponent } from './account.component';
import { SessionService } from './session.service';

const graphqlUrl = 'http://localhost:4000/graphql';

const ordersAnswer = {
  data: {
    orders: {
      totalCount: 1,
      pageInfo: { hasNextPage: false, endCursor: 'cursor-1' },
      edges: [
        {
          cursor: 'cursor-1',
          node: {
            id: 'order-1',
            number: 'ZM-2026-0001',
            status: 'PAID',
            placedAt: '2026-09-09T10:05:00Z',
            promotionCode: null,
            subtotal: { amount: 5599, currency: 'EUR' },
            discount: { amount: 0, currency: 'EUR' },
            shipping: { amount: 0, currency: 'EUR' },
            total: { amount: 5599, currency: 'EUR' },
            lines: [],
          },
        },
      ],
    },
  },
};

const sessions = [
  {
    id: 'session-1',
    device: 'Chrome on Windows',
    createdAt: '2026-09-09T09:00:00Z',
    lastUsedAt: '2026-09-09T10:00:00Z',
    current: true,
  },
  {
    id: 'session-2',
    device: 'Safari on iPhone',
    createdAt: '2026-09-01T09:00:00Z',
    lastUsedAt: '2026-09-02T10:00:00Z',
    current: false,
  },
];

describe('AccountComponent', () => {
  let fixture: ComponentFixture<AccountComponent>;
  let httpTestingController: HttpTestingController;
  let signedIn: ReturnType<typeof signal<boolean>>;
  let revokeSession: jest.Mock;
  let logOut: jest.Mock;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(AccountComponent);
    httpTestingController = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    if (signedIn()) {
      httpTestingController.expectOne(graphqlUrl).flush(ordersAnswer);
      await fixture.whenStable();
      fixture.detectChanges();
    }
  }

  beforeEach(async () => {
    signedIn = signal(true);
    revokeSession = jest.fn().mockResolvedValue([]);
    logOut = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        {
          provide: SessionService,
          useValue: {
            signedIn,
            customer: computed(() => ({
              id: 'customer-01',
              name: 'Jane Doe',
              email: 'jane@example.com',
            })),
            sessions: computed(() => sessions),
            revokeSession,
            logOut,
            logIn: jest.fn().mockResolvedValue([]),
            register: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('shows the order history and the open sessions of the customer', async () => {
    await render();
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Your account')).toBeTruthy();
    expect(byRole(page, 'heading', 'Order history')).toBeTruthy();
    expect(byRole(page, 'rowheader', 'ZM-2026-0001')).toBeTruthy();
    const openSessions = byRole(page, 'region', 'Open sessions');
    expect(allByRole(openSessions, 'listitem').length).toBe(2);
    expect(byRole(openSessions, 'listitem', /Chrome on Windows/).textContent).toContain(
      '(this device)'
    );
  });

  it('offers a revoke button on every session but the current one', async () => {
    await render();
    const openSessions = byRole(fixture.nativeElement as HTMLElement, 'region', 'Open sessions');

    expect(allByRole(openSessions, 'button').length).toBe(1);
    expect(queryByRole(openSessions, 'button', 'Revoke Chrome on Windows')).toBeNull();
  });

  it('revokes one session', async () => {
    await render();

    byRole(fixture.nativeElement as HTMLElement, 'button', 'Revoke Safari on iPhone').click();
    await fixture.whenStable();

    expect(revokeSession).toHaveBeenCalledWith('session-2');
  });

  it('sends the customer to the login screen after logging out', async () => {
    await render();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    byRole(fixture.nativeElement as HTMLElement, 'button', 'Log out').click();
    await fixture.whenStable();

    expect(logOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
```

### `src/app/api/authentication.interceptor.spec.ts`

The refresh, both ways in, and what happens when it is refused.

```ts
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AccessTokenStore } from './access-token-store';
import { authenticationInterceptor } from './authentication.interceptor';
import { GRAPHQL_URL } from './graphql-url';

const graphqlUrl = 'http://localhost:4000/graphql';

function refreshAnswer(token: string) {
  return {
    data: {
      refreshSession: {
        customer: null,
        accessToken: token,
        accessTokenExpiresAt: '2030-01-01T00:00:00Z',
        errors: [],
      },
    },
  };
}

describe('authenticationInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let accessTokenStore: AccessTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authenticationInterceptor])),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    accessTokenStore = TestBed.inject(AccessTokenStore);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('leaves a request to another address alone', async () => {
    accessTokenStore.hold('access-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.get('/assets/logo.svg'));
    const request = httpTestingController.expectOne('/assets/logo.svg');

    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(false);

    request.flush({});
    await answer;
  });

  it('sends the cookies and no bearer token for an anonymous visitor', async () => {
    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));
    const request = httpTestingController.expectOne(graphqlUrl);

    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({ data: {} });
    await answer;
  });

  it('leaves the token the caller put on the request alone while it is valid', async () => {
    accessTokenStore.hold('access-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(
      httpClient.post(graphqlUrl, {}, { headers: { Authorization: 'Bearer access-token' } })
    );
    const request = httpTestingController.expectOne(graphqlUrl);

    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');

    request.flush({ data: {} });
    await answer;
  });

  it('refreshes through the cookie before sending an expired token', async () => {
    accessTokenStore.hold('old-token', '2020-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));

    const refresh = httpTestingController.expectOne(graphqlUrl);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(refreshAnswer('fresh-token'));

    const retried = httpTestingController.expectOne(graphqlUrl);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ data: {} });

    await answer;
  });

  it('refreshes through the cookie and sends the request again after a 401', async () => {
    accessTokenStore.hold('old-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));

    httpTestingController
      .expectOne(graphqlUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpTestingController.expectOne(graphqlUrl).flush(refreshAnswer('fresh-token'));

    const retried = httpTestingController.expectOne(graphqlUrl);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ data: {} });

    await answer;
    expect(accessTokenStore.token()).toBe('fresh-token');
  });

  it('gives up and forgets the token when the refresh is refused', async () => {
    accessTokenStore.hold('old-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));

    httpTestingController
      .expectOne(graphqlUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpTestingController.expectOne(graphqlUrl).flush({
      data: {
        refreshSession: {
          customer: null,
          accessToken: null,
          accessTokenExpiresAt: null,
          errors: [{ code: 'SESSION_INVALID', message: 'Session invalid.', field: null }],
        },
      },
    });

    await expect(answer).rejects.toMatchObject({ status: 401 });
    expect(accessTokenStore.token()).toBeNull();
  });
});
```

### `src/app/api/access-token-store.spec.ts`



```ts
import { TestBed } from '@angular/core/testing';
import { AccessTokenStore } from './access-token-store';

describe('AccessTokenStore', () => {
  let store: AccessTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AccessTokenStore);
  });

  it('starts with no token, because the token lives in memory only', () => {
    expect(store.token()).toBeNull();
    expect(store.signedIn()).toBe(false);
  });

  it('holds the token and its expiry', () => {
    store.hold('access-token', '2026-09-09T10:15:00Z');

    expect(store.token()).toBe('access-token');
    expect(store.signedIn()).toBe(true);
  });

  it('releases the token', () => {
    store.hold('access-token', '2026-09-09T10:15:00Z');
    store.release();

    expect(store.token()).toBeNull();
    expect(store.signedIn()).toBe(false);
  });

  it('calls a token about to expire half a minute before the moment it stops being accepted', () => {
    store.hold('access-token', '2026-09-09T10:15:00Z');

    expect(store.aboutToExpire(Date.parse('2026-09-09T10:14:00Z'))).toBe(false);
    expect(store.aboutToExpire(Date.parse('2026-09-09T10:14:30Z'))).toBe(true);
    expect(store.aboutToExpire(Date.parse('2026-09-09T10:16:00Z'))).toBe(true);
  });

  it('never calls a token about to expire when it holds none', () => {
    expect(store.aboutToExpire()).toBe(false);
  });
});
```

### `src/app/api/graphql-answer.spec.ts`



```ts
import { readGraphqlData } from './graphql-answer';

describe('readGraphqlData', () => {
  it('gives the data of a successful answer', () => {
    expect(readGraphqlData<{ categories: string[] }>({ data: { categories: ['electronics'] } })).toEqual(
      { categories: ['electronics'] }
    );
  });

  it('throws the messages of a failed answer, because a GraphQL error is not a user error', () => {
    expect(() =>
      readGraphqlData({
        data: null,
        errors: [{ message: 'Origin not allowed.' }, { message: 'Nothing was run.' }],
      })
    ).toThrow('Origin not allowed. Nothing was run.');
  });

  it('throws when the answer carries neither data nor errors', () => {
    expect(() => readGraphqlData({})).toThrow('The store API answered without data.');
  });
});
```

### `src/app/api/user-error.spec.ts`



```ts
import { UserErrorCode } from './generated/contract';
import { userErrorMessage } from './user-error';

const everyCode: UserErrorCode[] = [
  'PRODUCT_NOT_FOUND',
  'OUT_OF_STOCK',
  'QUANTITY_INVALID',
  'CART_LINE_NOT_FOUND',
  'CART_EMPTY',
  'CODE_UNKNOWN',
  'CODE_EXPIRED',
  'CODE_EXHAUSTED',
  'CODE_MINIMUM_NOT_MET',
  'EMAIL_TAKEN',
  'EMAIL_INVALID',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'CREDENTIALS_INVALID',
  'RATE_LIMITED',
  'SESSION_INVALID',
  'SESSION_NOT_FOUND',
  'NOT_AUTHENTICATED',
  'ORDER_NOT_FOUND',
];

describe('userErrorMessage', () => {
  it.each(everyCode)('has a sentence of its own for %s', (code) => {
    expect(userErrorMessage(code).length).toBeGreaterThan(0);
  });

  it('never repeats a sentence, so a visitor can tell the refusals apart', () => {
    const sentences = everyCode.map((code) => userErrorMessage(code));

    expect(new Set(sentences).size).toBe(everyCode.length);
  });
});
```

### `src/app/cart/cart.service.spec.ts`

The cart read, the mutation that answers with the whole cart, and the read that runs again when the visitor logs in.

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { AccessTokenStore } from '../api/access-token-store';
import { GRAPHQL_URL } from '../api/graphql-url';
import { CartService } from './cart.service';

const graphqlUrl = 'http://localhost:4000/graphql';

const jacket = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: null,
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

function cartWith(quantity: number) {
  return {
    id: 'cart-1',
    updatedAt: '2026-09-09T10:00:00Z',
    promotion: null,
    subtotal: { amount: 5599 * quantity, currency: 'EUR' },
    shipping: { amount: 0, currency: 'EUR' },
    total: { amount: 5599 * quantity, currency: 'EUR' },
    lines: [
      {
        id: 'line-1',
        quantity,
        lineTotal: { amount: 5599 * quantity, currency: 'EUR' },
        product: jacket,
      },
    ],
  };
}

describe('CartService', () => {
  let service: CartService;
  let httpTestingController: HttpTestingController;
  let mutate: jest.Mock;

  beforeEach(async () => {
    mutate = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        { provide: Apollo, useValue: { mutate } },
      ],
    });

    service = TestBed.inject(CartService);
    httpTestingController = TestBed.inject(HttpTestingController);

    TestBed.tick();
    httpTestingController.expectOne(graphqlUrl).flush({ data: { cart: cartWith(2) } });
    await TestBed.inject(ApplicationRef).whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('reads the cart of the visitor and derives the item count and the total', () => {
    expect(service.lines().length).toBe(1);
    expect(service.itemCount()).toBe(2);
    expect(service.total()).toEqual({ amount: 11198, currency: 'EUR' });
    expect(service.empty()).toBe(false);
  });

  it('takes the answered cart from a mutation without reading the cart again', async () => {
    mutate.mockReturnValue(
      of({ data: { addToCart: { cart: cartWith(3), availableStock: null, errors: [] } } })
    );

    const change = await service.addProduct('product-03', 1);

    expect(change.errors).toEqual([]);
    expect(service.itemCount()).toBe(3);
  });

  it('keeps the cart it had when a mutation is refused', async () => {
    mutate.mockReturnValue(
      of({
        data: {
          addToCart: {
            cart: null,
            availableStock: 1,
            errors: [{ code: 'OUT_OF_STOCK', message: 'Not enough stock.', field: null }],
          },
        },
      })
    );

    const change = await service.addProduct('product-12', 2);

    expect(change.availableStock).toBe(1);
    expect(service.itemCount()).toBe(2);
  });

  it('reads the cart again as the customer when the visitor logs in', async () => {
    TestBed.inject(AccessTokenStore).hold('access-token', '2030-01-01T00:00:00Z');
    TestBed.tick();

    const request = httpTestingController.expectOne(graphqlUrl);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');

    request.flush({ data: { cart: cartWith(5) } });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.itemCount()).toBe(5);
  });

  it('asks for the cart of the anonymous visitor without a bearer token', () => {
    expect(service.lines().length).toBe(1);
  });

  it('refuses an answer without a cart payload', async () => {
    mutate.mockReturnValue(of({ data: undefined }));

    await expect(service.removeLine('line-1')).rejects.toThrow(
      'The store API answered without a cart payload.'
    );
  });
});
```

### `src/app/cart/stock-note.spec.ts`



```ts
import { stockNote } from './stock-note';

describe('stockNote', () => {
  it('says how many are left when the change carries an available stock', () => {
    expect(stockNote({ cart: null, availableStock: 1, errors: [] })).toBe(
      'We have 1 of this product left.'
    );
  });

  it('says nothing when the change carries no available stock', () => {
    expect(stockNote({ cart: null, availableStock: null, errors: [] })).toBeNull();
  });

  it('says nothing when there was no change at all', () => {
    expect(stockNote(null)).toBeNull();
  });
});
```

### `src/app/checkout/checkout-attempt.service.spec.ts`



```ts
import { TestBed } from '@angular/core/testing';
import { CheckoutAttempt } from './checkout-attempt.service';

describe('CheckoutAttempt', () => {
  let checkoutAttempt: CheckoutAttempt;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    checkoutAttempt = TestBed.inject(CheckoutAttempt);
  });

  it('makes one idempotency key and answers with it again, so a retry places no second order', () => {
    const first = checkoutAttempt.idempotencyKey();

    expect(first.length).toBeGreaterThan(0);
    expect(checkoutAttempt.idempotencyKey()).toBe(first);
  });

  it('keeps the key across a reload, because it lives in local storage', () => {
    const first = checkoutAttempt.idempotencyKey();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(CheckoutAttempt).idempotencyKey()).toBe(first);
  });

  it('makes a new key for the next checkout once the order is placed', () => {
    const first = checkoutAttempt.idempotencyKey();
    checkoutAttempt.finish();

    expect(checkoutAttempt.idempotencyKey()).not.toBe(first);
  });
});
```

### `src/shared/services/wishlist.service.spec.ts`

The one `resource` in the application, including the read that runs again on a login because the server merged the anonymous list.

```ts
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { AccessTokenStore } from '../../app/api/access-token-store';
import { ProductSummaryFragment } from '../../app/api/generated/contract';
import { WishlistService } from './wishlist.service';

const jacket: ProductSummaryFragment = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: null,
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

describe('WishlistService', () => {
  let service: WishlistService;
  let accessTokenStore: AccessTokenStore;
  let query: jest.Mock;
  let mutate: jest.Mock;

  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  beforeEach(async () => {
    query = jest.fn().mockReturnValue(of({ data: { wishlist: [jacket] } }));
    mutate = jest.fn().mockReturnValue(of({ data: { addToWishlist: { products: [], errors: [] } } }));

    TestBed.configureTestingModule({
      providers: [{ provide: Apollo, useValue: { query, mutate } }],
    });

    service = TestBed.inject(WishlistService);
    accessTokenStore = TestBed.inject(AccessTokenStore);

    await settle();
  });

  it('reads the wishlist of the visitor from the api', () => {
    expect(query).toHaveBeenCalledTimes(1);
    expect(service.products()).toEqual([jacket]);
    expect(service.count()).toBe(1);
  });

  it('knows whether a product is on the wishlist', () => {
    expect(service.contains('product-03')).toBe(true);
    expect(service.contains('product-07')).toBe(false);
  });

  it('adds a product through addToWishlist and keeps the answered list', async () => {
    mutate.mockReturnValue(of({ data: { addToWishlist: { products: [jacket], errors: [] } } }));

    await service.add(jacket);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { productId: 'product-03' } })
    );
    expect(service.products()).toEqual([jacket]);
  });

  it('removes a product through removeFromWishlist and keeps the answered list', async () => {
    mutate.mockReturnValue(of({ data: { removeFromWishlist: { products: [], errors: [] } } }));

    await service.remove('product-03');

    expect(service.products()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('toggles a saved product off and an unsaved product on', async () => {
    mutate.mockReturnValue(of({ data: { removeFromWishlist: { products: [], errors: [] } } }));
    await service.toggle(jacket);
    expect(service.products()).toEqual([]);

    mutate.mockReturnValue(of({ data: { addToWishlist: { products: [jacket], errors: [] } } }));
    await service.toggle(jacket);
    expect(service.products()).toEqual([jacket]);
  });

  it('reads the wishlist again when the visitor logs in, because the server merged it', async () => {
    accessTokenStore.hold('access-token', '2026-09-09T10:15:00Z');
    await settle();

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('reads the wishlist again when the visitor logs out', async () => {
    accessTokenStore.hold('access-token', '2026-09-09T10:15:00Z');
    await settle();
    accessTokenStore.release();
    await settle();

    expect(query).toHaveBeenCalledTimes(3);
  });
});
```

### `src/app/account/signed-in.guard.spec.ts`

The guard lets a customer through and sends everybody else to the login screen with the way back.

```ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
  type ActivatedRouteSnapshot,
} from '@angular/router';
import { SessionService } from './session.service';
import { signedInGuard } from './signed-in.guard';

describe('signedInGuard', () => {
  let signedIn: ReturnType<typeof signal<boolean>>;

  function guardFor(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        signedInGuard(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot
        ) as boolean | UrlTree
    );
  }

  beforeEach(() => {
    signedIn = signal(false);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SessionService, useValue: { signedIn } }],
    });
  });

  it('lets a signed in customer through', () => {
    signedIn.set(true);

    expect(guardFor('/checkout')).toBe(true);
  });

  it('sends an anonymous visitor to the login screen with the way back', () => {
    const answer = guardFor('/checkout');

    expect(TestBed.inject(Router).serializeUrl(answer as UrlTree)).toBe(
      '/login?returnTo=%2Fcheckout'
    );
  });
});
```

### `src/app/account/session-marker.spec.ts`



```ts
import { TestBed } from '@angular/core/testing';
import { SessionMarker } from './session-marker';

describe('SessionMarker', () => {
  let sessionMarker: SessionMarker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sessionMarker = TestBed.inject(SessionMarker);
    sessionMarker.forget();
  });

  it('starts with no marker, so a first visit makes no refresh request', () => {
    expect(sessionMarker.present()).toBe(false);
  });

  it('remembers that this browser has a session', () => {
    sessionMarker.remember();

    expect(sessionMarker.present()).toBe(true);
    expect(document.cookie).toContain('zappy_session=open');
  });

  it('forgets the marker again', () => {
    sessionMarker.remember();
    sessionMarker.forget();

    expect(sessionMarker.present()).toBe(false);
  });
});
```

### `src/app/login/login.component.spec.ts`

The login screen, including the notice a revoked session leaves behind.

```ts
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole, queryByRole } from '../../testing/roles';
import { SessionService } from '../account/session.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let sessionEnded: ReturnType<typeof signal<boolean>>;
  let logIn: jest.Mock;

  beforeEach(async () => {
    sessionEnded = signal(false);
    logIn = jest.fn().mockResolvedValue([]);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: { sessionEnded, logIn, register: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('shows the login heading and the fields the customer fills', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Log in')).toBeTruthy();
    expect(byRole(page, 'textbox', 'Email address')).toBeTruthy();
    expect(byRole(page, 'button', 'Log in')).toBeTruthy();
    expect(queryByRole(page, 'textbox', 'Name')).toBeNull();
    expect(queryByRole(page, 'alert')).toBeNull();
  });

  it('says so when the session was ended somewhere else', () => {
    sessionEnded.set(true);
    fixture.detectChanges();

    expect(byRole(fixture.nativeElement as HTMLElement, 'alert').textContent).toContain(
      'Your session has ended. Please log in again.'
    );
  });

  it('logs the customer in and takes them where they were going', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    fixture.componentRef.setInput('returnTo', '/checkout');
    fixture.detectChanges();

    const email = byRole(page, 'textbox', 'Email address') as HTMLInputElement;
    email.value = 'jane@example.com';
    email.dispatchEvent(new Event('input'));

    const password = page.querySelector('#login-form-password') as HTMLInputElement;
    password.value = 'correct horse battery staple';
    password.dispatchEvent(new Event('input'));

    byRole(page, 'button', 'Log in').click();
    await fixture.whenStable();

    expect(logIn).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'correct horse battery staple',
    });
    expect(navigate).toHaveBeenCalledWith('/checkout');
  });
});
```

### `src/app/register/register.component.spec.ts`



```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole } from '../../testing/roles';
import { SessionService } from '../account/session.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let register: jest.Mock;

  beforeEach(async () => {
    register = jest.fn().mockResolvedValue([]);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: { register, logIn: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  it('asks for a name, an email address and a password', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Register')).toBeTruthy();
    expect(byRole(page, 'textbox', 'Name')).toBeTruthy();
    expect(byRole(page, 'textbox', 'Email address')).toBeTruthy();
    expect(byRole(page, 'button', 'Register')).toBeTruthy();
  });

  it('registers the customer and takes them to their account', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const name = byRole(page, 'textbox', 'Name') as HTMLInputElement;
    name.value = 'Sam Rider';
    name.dispatchEvent(new Event('input'));

    const email = byRole(page, 'textbox', 'Email address') as HTMLInputElement;
    email.value = 'sam@example.com';
    email.dispatchEvent(new Event('input'));

    const password = page.querySelector('#login-form-password') as HTMLInputElement;
    password.value = 'correct horse battery staple';
    password.dispatchEvent(new Event('input'));

    byRole(page, 'button', 'Register').click();
    await fixture.whenStable();

    expect(register).toHaveBeenCalledWith({
      name: 'Sam Rider',
      email: 'sam@example.com',
      password: 'correct horse battery staple',
    });
    expect(navigate).toHaveBeenCalledWith('/account');
  });
});
```

### `src/shared/services/local-storage.service.spec.ts`

Unchanged.

```ts
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    service = new LocalStorageService();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should store and retrieve an object', () => {
    const data = { id: 1, name: 'Test' };
    service.set('testKey', data);
    const result = service.get<typeof data>('testKey');
    expect(result).toEqual(data);
  });

  it('should return null if key does not exist', () => {
    const result = service.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should handle invalid JSON on get', () => {
    localStorage.setItem('bad', 'not-json');
    const result = service.get('bad');
    expect(result).toBeNull();
  });

  it('should remove an item', () => {
    localStorage.setItem('toRemove', JSON.stringify({}));
    service.remove('toRemove');
    expect(localStorage.getItem('toRemove')).toBeNull();
  });

  it('should clear all storage', () => {
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');
    service.clear();
    expect(localStorage.length).toBe(0);
  });

  it('should detect if a key exists', () => {
    localStorage.setItem('exists', 'true');
    expect(service.has('exists')).toBe(true);
    expect(service.has('missing')).toBe(false);
  });
});
```

### `src/shared/components/product-card/product-card.component.spec.ts`



```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ProductSummaryFragment } from '../../../app/api/generated/contract';
import ProductCardComponent from './product-card.component';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;
  let mockProduct: ProductSummaryFragment;

  beforeEach(() => {
    mockProduct = {
      id: 'product-03',
      name: 'Mens Cotton Jacket',
      slug: 'mens-cotton-jacket',
      stock: 8,
      imageUrl: '/images/products/mens-cotton-jacket.svg',
      price: { amount: 4250, currency: 'EUR' },
      category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
    };

    TestBed.configureTestingModule({
      imports: [ProductCardComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', mockProduct);
    fixture.detectChanges();
  });

  it.each([
    ['.card__title', 'Mens Cotton Jacket'],
    ['.card__price', '€42.50'],
    ['.card__category', "Men's clothing"],
    ['.card__stock', '8 in stock'],
  ])('should render %s with correct content', (selector: string, expected: string) => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector(selector)?.textContent).toContain(expected);
  });

  it('should render product image with correct src', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.product-image')?.getAttribute('src')).toBe(
      '/images/products/mens-cotton-jacket.svg'
    );
  });

  it('should link to the product page', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.card__link')?.getAttribute('href')).toBe(
      '/product/mens-cotton-jacket'
    );
  });

  it('should show "Save to wishlist" when inWishlist is false', () => {
    fixture.componentRef.setInput('inWishlist', false);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action-wish-list'));
    expect(button.nativeElement.textContent).toContain('Save to wishlist');
  });

  it('should show "Remove from wishlist" when inWishlist is true', () => {
    fixture.componentRef.setInput('inWishlist', true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action-wish-list'));
    expect(button.nativeElement.textContent).toContain('Remove from wishlist');
  });

  it('should emit toggleWishlist event when the wishlist button is clicked', () => {
    const emitted: ProductSummaryFragment[] = [];
    component.toggleWishlist.subscribe((product) => emitted.push(product));

    fixture.debugElement.query(By.css('.card__action-wish-list')).nativeElement.click();

    expect(emitted).toEqual([mockProduct]);
  });

  it('should emit addToCart event when the cart button is clicked', () => {
    const emitted: ProductSummaryFragment[] = [];
    component.addToCart.subscribe((product) => emitted.push(product));

    fixture.debugElement.query(By.css('.card__action')).nativeElement.click();

    expect(emitted).toEqual([mockProduct]);
  });

  it('should disable the cart button when the product has no stock', () => {
    fixture.componentRef.setInput('product', { ...mockProduct, stock: 0 });
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action'));
    expect(button.nativeElement.disabled).toBe(true);
  });
});
```

### `src/app/header/header.component.spec.ts`



```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import HeaderComponent from './header.component';
import { WishlistDrawerService } from '../wishlist-drawer/wishlist-drawer.service';
import { WishlistService } from '../../shared/services/wishlist.service';
import { CartService } from '../cart/cart.service';
import { SessionService } from '../account/session.service';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let mockDrawerService: Partial<WishlistDrawerService>;
  let mockWishlistService: Partial<WishlistService>;
  let mockCartService: Partial<CartService>;
  let signedIn: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    mockDrawerService = {
      toggle: jest.fn(),
    };

    mockWishlistService = {
      count: signal(3),
    };

    mockCartService = {
      itemCount: signal(2),
    };

    signedIn = signal(false);

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([{ path: 'about', component: DummyComponent }]),
        { provide: WishlistDrawerService, useValue: mockDrawerService },
        { provide: WishlistService, useValue: mockWishlistService },
        { provide: CartService, useValue: mockCartService },
        { provide: SessionService, useValue: { signedIn } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('should render all menu links', () => {
    const links = fixture.debugElement.queryAll(By.css('.desktop-navbar__link'));
    expect(links.length).toBe(2);
    expect(links[0].nativeElement.textContent.trim()).toBe('Catalogue');
    expect(links[1].nativeElement.textContent.trim()).toBe('About');
  });

  it('should set the correct active link', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/about');
    fixture.detectChanges();

    const activeItem = fixture.debugElement.query(By.css('[data-active="true"]'));
    expect(activeItem?.nativeElement.textContent).toContain('About');
  });

  it('should display the wishlist count', () => {
    const badge = fixture.debugElement.query(By.css('.wishlist-count-badge'));
    expect(badge.nativeElement.textContent).toContain('3');
  });

  it('should display the number of items in the cart', () => {
    const badge = fixture.debugElement.query(By.css('.cart-count-badge'));
    expect(badge.nativeElement.textContent).toContain('2');
  });

  it('should name the cart and the wishlist with their counts', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('[aria-label="Cart, 2 items"]')).toBeTruthy();
    expect(page.querySelector('[aria-label="Wishlist, 3 saved"]')).toBeTruthy();
  });

  it('should offer a log in link while nobody is signed in and an account link after', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Log in');

    signedIn.set(true);
    fixture.detectChanges();

    expect(page.textContent).toContain('Account');
    expect(page.textContent).not.toContain('Log in');
  });

  it('should call openDrawer when heart button is clicked', () => {
    const button = fixture.debugElement.query(By.css('.desktop-navbar__check-wish-list'));
    button.nativeElement.click();
    expect(mockDrawerService.toggle).toHaveBeenCalled();
  });
});

@Component({
  selector: 'app-dummy',
  template: '<p>Dummy</p>',
})
class DummyComponent {}
```

### `src/shared/money.spec.ts`



```ts
import { formatMoney } from './money';

describe('formatMoney', () => {
  it.each([
    [{ amount: 10995, currency: 'EUR' }, '€109.95'],
    [{ amount: 495, currency: 'EUR' }, '€4.95'],
    [{ amount: 0, currency: 'EUR' }, '€0.00'],
    [{ amount: 69500, currency: 'EUR' }, '€695.00'],
  ])('renders %o as %s', (money, expected) => {
    expect(formatMoney(money)).toBe(expected);
  });
});
```

## Versions

`docs/versions.md` in the repository root is the one place for versions. This item added
four packages and pinned each to an exact version, read from the npm registry on
9 September 2026:

| Package | Version | Why this one |
|---|---|---|
| `apollo-angular` | 14.2.0 | the line for Angular 20 to 22, already in `docs/versions.md`. Its peers are `@angular/core` `^20 \|\| ^21 \|\| ^22`, `@apollo/client` `^4.2.3`, `graphql` `^16 \|\| ^17` and `rxjs` `^7.8` |
| `@apollo/client` | 4.2.12 | the version `docs/versions.md` records. React and `graphql-ws` are optional peers, so nothing from React comes with it |
| `graphql` | 17.0.2 | the reference implementation `docs/versions.md` records. `print` from it turns a typed document into the query string a read sends |
| `@graphql-typed-document-node/core` | 3.2.0 | the `TypedDocumentNode` type the generated file imports. A runtime dependency because the generated file imports it by name |

And three for the code generation, verified on npm the same day:

| Package | Version | Why this one |
|---|---|---|
| `@graphql-codegen/cli` | 7.4.0 | the current release, peer `graphql` up to `^17` |
| `@graphql-codegen/typescript-operations` | 6.1.6 | the result and variables types per operation |
| `@graphql-codegen/typed-document-node` | 7.1.0 | the `TypedDocumentNode` constant per operation |

`@graphql-codegen/typescript` is deliberately not used. It emits the whole schema, and
`typescript-operations` already emits every enum and every input type the operations
touch, so running both writes `UserErrorCode`, `PromotionKind`, `OrderStatus`,
`LoginInput` and `RegisterInput` twice in one file. Dropping it took the generated file
from 1434 lines to 374.

The rest of the stack is unchanged and is the table the previous item left:

| Package | Version |
|---|---|
| Angular | 22.1.5 |
| Angular CLI and `@angular/build` | 22.1.7 |
| TypeScript | 6.0.3 |
| RxJS | 7.8 |
| Jest | 30.5.1 |
| jest-preset-angular | 17.0.0 |
| ESLint | 10.10.0 |
| angular-eslint | 22.5.0 |
| typescript-eslint | 8.70.0 |
| Prettier | 3.9.6 |

Styling stays SCSS with BEM, which is what this folder had. `BACKLOG.md` section 7 asks
for Tailwind across the three frontends, and moving to it means rewriting every existing
stylesheet in the same change. That is a change of its own and it is not this item.

## What is not done yet

- **The catalogue pages forward only, and only to one hundred.** "Show more products"
  raises `first` from 24 to at most 100, which is the cap the schema sets. The `after`
  cursor is in the query and the answer, and no screen walks with it yet, because twenty
  products fit on one page.
- **Product drawings are placeholders.** `Product.imageUrl` points at
  `/images/products/<slug>.svg`, which this frontend does not ship. Every image falls
  back to `public/images/products/placeholder.svg` when the file is not there.
- **`RATE_LIMITED` cannot be seen against the mock server**, which does not rate limit.
  The sentence for it is in `userErrorMessage` all the same, because a backend from
  `backends/` will answer it.
- **The end to end suite does not run against this frontend yet.** It is item Z5 and the
  React Router agent owns the folder.
