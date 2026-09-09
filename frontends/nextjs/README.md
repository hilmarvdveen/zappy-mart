# The store front on Next.js 16, App Router

Item Z8 of [BACKLOG.md](../../BACKLOG.md). The Zappy Mart store on the Next.js
App Router: server components read, server actions write, and one route handler
is the backend for frontend that holds the API tokens. It talks to any backend
that serves `contract/schema.graphql`, and during development it talks to the
mock server in [tools/mock-server](../../tools/mock-server).

It runs on **port 3001**. Port 3000 is taken on the machine this was built on,
and the shared end to end suite expects 3001 as well.

It passes the shared end to end suite in [tools/end-to-end](../../tools/end-to-end),
including the test that runs with JavaScript switched off. That suite is the
contract every store front in this repository answers to, and the section at the
end of this README shows the run.

What a reader takes away from this project, next to the React Router and the
Angular versions of the same store:

- A server component that queries the API and renders on the server, with no
  client side store holding server data at all.
- A server action that mutates and then invalidates exactly the cache that went
  stale.
- The backend for frontend shape: the browser holds one encrypted cookie, the
  API tokens never leave the server, and the API's own cookies are carried by
  the frontend's server on the visitor's behalf.
- Where each of the four Next.js caches sits and which one a mutation touches.
- Why a store front that has to work without JavaScript keeps its content out
  of a Suspense boundary, which is written out under "Streaming, and why there
  is none" below.

## The screens

Six screens carry the store, and three more make them reachable.

| Route | What it does |
|---|---|
| `/` | The catalogue. The category, the search term and the in stock filter live in the address (`/?search=MBJ&category=womens-clothing`), so a filtered catalogue is a link you can share. |
| `/products/<slug>` | One product with its description, its stock, a quantity field, add to cart and save to wishlist. A product with no stock is shown and its button is disabled, which is the rule in `docs/domain.md`. |
| `/cart` | One table row per line, each with a quantity field, an update button and a remove button, then the totals and the way to the checkout. |
| `/checkout` | What is being ordered, the promotion code field, the totals, and one button that places the order. A visitor without an account is sent to the log in screen, because an order belongs to a customer. |
| `/orders/<id>` | The order confirmation: the order number, the lines with the names and prices of the moment, and the totals. |
| `/account` | The customer, the order history, the open sessions with a revoke button each, and the wishlist. |
| `/login` | Log in. Supporting screen: the six above are the store, this one is how you reach the last two. |
| `/register` | Register, which logs the new customer in straight away. |
| `/wishlist` | The saved products. It works logged out as well, because the wishlist lives on the server against the `zappy_cart` cookie, the same way the cart does. |

Two route handlers sit behind them:

| Route | What it does |
|---|---|
| `POST /api/session` | The backend for frontend the browser talks to. It exchanges the refresh token for a new access token shortly before the old one expires. It answers with the new expiry and never with a token. It refuses a request whose `Origin` is not the store front. |
| `GET /images/products/<name>.svg` | Draws a placeholder for a product picture. `contract/seed/products.json` points at `/images/products/<slug>.svg` and the contract holds no binary, so each frontend serves its own drawings. Photography is out of scope, so this one is a coloured circle with the product's initials. |

### The names the screens use

The accessible names on these screens are not a matter of taste. They are the
contract in the table "The names the store front has to use" in
[tools/end-to-end/README.md](../../tools/end-to-end/README.md), and the same
words appear in the React Router and the Angular store fronts, which is what
lets one Playwright suite drive all three. So the header link reads
`Cart, 2 items` and not `Cart (2)`, the catalogue button reads `Filter` and not
`Show products`, and the log in screen is at `/login` with an `h1` of `Log in`.

A change to any of those words is a change to the suite and to three store
fronts together.

### The wishlist, logged out and logged in

The wishlist behaves like the cart. An anonymous visitor's list is kept by the
API against the `zappy_cart` cookie, so `addToWishlist` and `removeFromWishlist`
work logged out, and the `wishlist` query answers with the saved products. On
login the API merges that list into the customer's own. The store front keeps no
copy in the browser: there is no client store for server data anywhere in this
project.

## The shape: what runs where

```
the browser
  |  one cookie: zappy_store_front, httpOnly, encrypted
  v
the Next.js server                       <- the backend for frontend
  server components  ->  readFromApi()   \
  server actions     ->  writeToApi()     >  Apollo Client, one per request
  route handlers     ->  both            /
  |  Authorization: Bearer <access token>
  |  Cookie: zappy_refresh=..., zappy_cart=...
  |  Origin: http://localhost:3001
  v
the GraphQL API (a backend, or tools/mock-server)
```

Everything that reads is a server component. Everything that writes is a server
action. Ten components carry `"use client"`, and each has one reason: eight use
`useActionState` to render a refusal from the contract next to the field that
caused it, `SubmitButton` uses `useFormStatus` to disable itself while its form
is in flight, and `SessionRefresher` owns the timer that keeps the login alive.

The two functions every screen and every action goes through live in
`server/storefrontClient.ts`:

- `readFromApi(document, variables)` runs a query and answers `null` when the
  API cannot be reached, so a screen renders a notice instead of a stack trace.
- `writeToApi(document, variables)` runs a mutation and persists whatever
  cookies the API set, which only a server action or a route handler is allowed
  to do.

Both build one Apollo Client per request. A client is never shared between
visitors, because it carries one visitor's access token.

## The session: where the tokens live

`docs/security.md` gives Next.js the backend for frontend shape, and this is it,
in four rules.

**One cookie reaches the browser.** `zappy_store_front` is httpOnly, SameSite
Lax, Secure in production, and encrypted with AES-256-GCM from `node:crypto`. It
carries the access token, the moment that token expires, and the values of the
API's own two cookies. Change one character of it and it decrypts to no session
at all, because the authentication tag no longer matches.

**The API's cookies are carried, never forwarded.** `zappy_refresh` and
`zappy_cart` are set by the API on the frontend's server. The store front reads
them off the answer, keeps them inside its own encrypted cookie, and sends them
back as a `Cookie` header on the next call. The browser never sees either of
them, so no script in the page can reach the refresh token and no cart id is
guessable from the client.

**Only a write persists a cookie.** Next.js lets a server action and a route
handler set a cookie and does not let a server component do it. That fits the
API exactly: it creates the cart cookie on the first cart mutation, and a
mutation is always a server action here.

**Signing out is throwing the cookie away.** The `logout` mutation revokes the
session, and the backends check that session on every request, so the access
token is dead the moment the mutation returns. Clearing the frontend cookie is
the whole of the rest. That is also why replaying an old cookie cannot revive a
login: the token inside it names a session the API has already closed. A screen
that finds a customer of `null` while the cookie still holds an access token
sends the visitor to `/login?sessionEnded=true`, which is where the notice
"Your session has ended. Please log in again." comes from.

The refresh runs from the browser through `POST /api/session`, because only the
browser knows the visitor is still there and only a route handler may write the
new cookie. `SessionRefresher` schedules one call a minute before the access
token expires. A refresh token is used once: if two tabs ever refresh at the
same moment the API revokes the family and both are asked to log in again, which
is the rotation rule of `docs/security.md` working as designed.

## The cache, and what a mutation invalidates

Next.js has four caches. This store front uses one, leans on a second, and is
deliberately outside the other two.

**Request memoization is used.** `readCategories`, `readCart` and
`readSignedInCustomer` are wrapped in React's `cache()`. The header in the root
layout and the screen below it both ask for the cart, and one render makes one
call.

**The Data Cache is not used.** A GraphQL call is a `POST`, and Next.js stores
only `GET` answers in the Data Cache, so `next: { revalidate }` on these calls
would do nothing at all. It would also be the wrong tool: the cart, the
wishlist, the orders and the sessions belong to one visitor, and the catalogue
has to show the stock as it is now. Every call passes `cache: "no-store"` and
says so out loud.

**The Full Route Cache stays empty.** Every route reads the session cookie
through the header, so every route is dynamic. `next build` prints `ƒ` next to
all twelve of them.

**The Router Cache is the one a mutation invalidates.** It is the browser's copy
of the React Server Component payload of the screens the visitor has already
seen or prefetched. Every server action ends with `revalidateStorefront()`,
which is `revalidatePath("/", "layout")`. It covers the whole tree on purpose:
the header lives in the root layout and shows the cart count and the wishlist
count, so a change to either changes what every screen renders. A narrower
`revalidatePath("/cart")` would leave a stale count in the header of every other
screen.

## Streaming, and why there is none

The first version of this store front streamed. The product grid sat behind a
`<Suspense>` boundary with a skeleton fallback, and so did the cart count in the
header. It looked right and it failed the progressive enhancement test of the
shared suite, for a reason worth writing down.

React streams a boundary that is still pending when the shell is flushed by
sending the finished markup later, at the end of the document, inside a hidden
element, followed by a small inline script that moves it into place. With
JavaScript switched off that script never runs, so everything inside the
boundary stays hidden. A visitor without JavaScript would have seen a catalogue
with no products and a header with no cart.

So this store front has no Suspense boundary. Every screen awaits its data and
sends one complete document. The cost is real and it is named here: the first
byte waits for the API, and on a slow API a visitor sees nothing until it
answers. The lesson is the trade: streaming belongs on a screen that needs
JavaScript anyway, and a store front that promises to work without it keeps its
content in the shell.

The same reasoning drives two more choices. The catalogue filter is a plain
`method="get"` form, so the browser navigates on its own and the filter works
with no JavaScript at all. Every cart form posts to a server action, which React
submits as an ordinary form post when JavaScript is off.

## The route announcer

Next.js appends a live region to every page so a screen reader hears the new
page title after a client side navigation, and it gives that region
`role="alert"`. An assertive alert is the wrong tool for a route change, which
should not interrupt what the visitor is hearing, and it means every page in the
application carries a permanent second alert next to any alert of its own.

`components/PoliteRouteAnnouncer.tsx` installs the announcer node before Next.js
asks for it, in an insertion effect, which runs before every other effect of the
same commit. Next.js reuses an announcer that already exists, which is a branch
in its own code, so the store front decides what that node is: a polite,
atomic live region with no live region role at all. Route changes are still
announced. `role="alert"` and `role="status"` now belong to the screens, which
is what makes "Added to your cart." and "Your session has ended." findable as
the one status and the one alert on their screen.

## From an empty folder to a running store

Node 24 is what this was built and run on (24.20.0). The commands below are the
whole of it.

### 1. Create the project

From `frontends/`:

```
npx create-next-app@16.3.4 nextjs --typescript --tailwind --eslint --app \
  --import-alias "@/*" --use-npm --skip-install --disable-git --empty --yes
```

No `--src-dir`: the house rule is no abbreviations in file names, so the routes
live in `app/` at the root of the project and the other folders sit beside it.
`--empty` keeps the starter page down to one line. `create-next-app` also writes
an `AGENTS.md` and a `CLAUDE.md`, and `agentRules: false` in `next.config.ts`
stops `next dev` writing them again, so delete both.

### 2. Pin the versions and install

Replace `package.json` with the file below, then:

```
npm install
```

Every version is exact, with no `^`, because `docs/versions.md` is the one place
a version is decided. The table at the end of this README says where each one
came from.

### 3. Generate the typed documents

```
npm run generate
```

That reads `../../contract/schema.graphql` and `graphql/operations.ts` and writes
`graphql/generated/`. The generated folder is committed, so a clean checkout
builds without running the generator first. It is never edited by hand, and it
is the only folder ESLint ignores.

A change to the contract is one command on this side.

### 4. Start a backend

Either a backend from `backends/`, or the mock server:

```
cd ../../tools/mock-server
node server.mjs
```

It serves `http://localhost:4000/graphql` and allows the origin
`http://localhost:3001`. Give it another port with `ZAPPY_MOCK_PORT=4001` when
somebody else is already using 4000, and point the store front at it with
`ZAPPY_GRAPHQL_URL`.

### 5. Run the store front

```
npm run dev
```

It prints:

```
▲ Next.js 16.3.4 (Turbopack)
- Local:         http://localhost:3001
✓ Ready in 1854ms
```

Open `http://localhost:3001`. The catalogue shows the twenty seeded products.
Log in with `jane@example.com` and the password
`correct horse battery staple`, which is the one customer in
`contract/seed/customers.json`.

### Configuration

Copy `.env.example` to `.env.local` and change what you need. Every value has a
working default, so the store runs with no environment file at all.

| Variable | Default | What it is |
|---|---|---|
| `ZAPPY_GRAPHQL_URL` | `http://localhost:4000/graphql` | The API to talk to. Point it at a backend from `backends/` to run against that one. |
| `ZAPPY_STOREFRONT_ORIGIN` | `http://localhost:3001` | The `Origin` header the store front sends, which the API checks on every mutation, and the origin its own route handlers accept. |
| `ZAPPY_SESSION_SECRET` | a development string | The key the session cookie is encrypted with. Set a long random value anywhere the store front is not a laptop. |

## Every file

The project as it stands, with the content of every file. The generated folder
`graphql/generated/` is the one exception: it is 120KB of machine output and
`npm run generate` writes it.

### Configuration and tooling

`package.json` names every script the project has. `tsconfig.json` and
`postcss.config.mjs` are what `create-next-app` wrote. `vitest.config.ts` maps
the `@/` alias the same way `tsconfig.json` does, and resolves `server-only` to
its empty build so a test may import a module that is marked server only.

**`package.json`**

```json
{
  "name": "zappy-mart-storefront-nextjs",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate": "graphql-codegen --config codegen.ts"
  },
  "dependencies": {
    "@apollo/client": "4.2.12",
    "graphql": "17.0.2",
    "next": "16.3.4",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "rxjs": "7.8.2",
    "server-only": "0.0.1"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "7.4.0",
    "@graphql-codegen/client-preset": "6.1.3",
    "@tailwindcss/postcss": "4.3.3",
    "@testing-library/dom": "10.4.1",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.7",
    "@types/node": "24.13.3",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.7",
    "@vitejs/plugin-react": "6.1.1",
    "eslint": "10.10.0",
    "eslint-config-next": "16.3.4",
    "jsdom": "30.0.1",
    "tailwindcss": "4.3.3",
    "typescript": "6.0.3",
    "vite": "8.2.2",
    "vitest": "5.0.0"
  }
}
```

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

**`next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
};

export default nextConfig;
```

**`postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**`eslint.config.mjs`**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    settings: {
      react: { version: "19.2.8" },
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "graphql/generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

**`codegen.ts`**

```ts
import type { CodegenConfig } from "@graphql-codegen/cli";

const codegenConfiguration: CodegenConfig = {
  schema: "../../contract/schema.graphql",
  documents: ["graphql/operations.ts"],
  ignoreNoDocuments: false,
  generates: {
    "graphql/generated/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
        enumsAsConst: true,
        scalars: {
          DateTime: "string",
          ID: "string",
        },
      },
    },
  },
};

export default codegenConfiguration;
```

**`vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${rootDirectory}` },
      {
        find: /^server-only$/,
        replacement: `${rootDirectory}node_modules/server-only/empty.js`,
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
```

**`vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

**`.env.example`**

```
ZAPPY_GRAPHQL_URL=http://localhost:4000/graphql
ZAPPY_STOREFRONT_ORIGIN=http://localhost:3001
ZAPPY_SESSION_SECRET=replace-this-with-a-long-random-string
```

**`.gitignore`**

```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*
!.env.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

### The one configuration module

Every environment variable is read in one place and nowhere else, so a reader
finds the whole configuration of the store front by opening one file.

**`configuration.ts`**

```ts
export const graphqlEndpoint =
  process.env.ZAPPY_GRAPHQL_URL ?? "http://localhost:4000/graphql";

export const storefrontOrigin =
  process.env.ZAPPY_STOREFRONT_ORIGIN ?? "http://localhost:3001";

export const sessionSecret =
  process.env.ZAPPY_SESSION_SECRET ??
  "zappy-mart-development-session-secret-not-for-production";

export const runningInProduction = process.env.NODE_ENV === "production";

export const catalogueSize = 24;

export const orderHistorySize = 10;
```

### The contract: the typed documents

Every query and every mutation the store front runs, written once. `graphql()`
comes from the generated folder and answers with a `TypedDocumentNode`, so the
variables and the answer of every call are checked against
`contract/schema.graphql` at build time. Change the schema, run
`npm run generate`, and the type checker names every screen that has to change.

**`graphql/operations.ts`**

```ts
import { graphql } from "@/graphql/generated";

export const productSummaryFragment = graphql(`
  fragment ProductSummary on Product {
    id
    name
    slug
    stock
    imageUrl
    price {
      amount
      currency
    }
    category {
      id
      name
      slug
    }
  }
`);

export const productDetailFragment = graphql(`
  fragment ProductDetail on Product {
    ...ProductSummary
    description
  }
`);

export const cartDetailFragment = graphql(`
  fragment CartDetail on Cart {
    id
    updatedAt
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
    promotion {
      code
      kind
      discount {
        amount
        currency
      }
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
`);

export const orderDetailFragment = graphql(`
  fragment OrderDetail on Order {
    id
    number
    status
    promotionCode
    placedAt
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
`);

export const userErrorFragment = graphql(`
  fragment UserErrorDetail on UserError {
    code
    message
    field
  }
`);

export const categoriesQuery = graphql(`
  query Categories {
    categories {
      id
      name
      slug
    }
  }
`);

export const catalogueQuery = graphql(`
  query Catalogue($filter: ProductFilter, $first: Int, $after: String) {
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
`);

export const productBySlugQuery = graphql(`
  query ProductBySlug($slug: String!) {
    product(slug: $slug) {
      ...ProductDetail
    }
  }
`);

export const cartQuery = graphql(`
  query CartContents {
    cart {
      ...CartDetail
    }
  }
`);

export const signedInCustomerQuery = graphql(`
  query SignedInCustomer {
    me {
      id
      name
      email
    }
    wishlist {
      id
    }
  }
`);

export const accountQuery = graphql(`
  query Account {
    me {
      id
      name
      email
      createdAt
      sessions {
        id
        device
        createdAt
        lastUsedAt
        current
      }
      wishlist {
        ...ProductSummary
      }
    }
  }
`);

export const wishlistQuery = graphql(`
  query Wishlist {
    wishlist {
      ...ProductSummary
    }
  }
`);

export const orderHistoryQuery = graphql(`
  query OrderHistory($first: Int, $after: String) {
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
`);

export const orderByIdQuery = graphql(`
  query OrderById($id: ID!) {
    order(id: $id) {
      ...OrderDetail
    }
  }
`);

export const addToCartMutation = graphql(`
  mutation AddToCart($productId: ID!, $quantity: Int) {
    addToCart(productId: $productId, quantity: $quantity) {
      availableStock
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const changeCartLineQuantityMutation = graphql(`
  mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {
    changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {
      availableStock
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const removeCartLineMutation = graphql(`
  mutation RemoveCartLine($lineId: ID!) {
    removeCartLine(lineId: $lineId) {
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const applyPromotionCodeMutation = graphql(`
  mutation ApplyPromotionCode($code: String!) {
    applyPromotionCode(code: $code) {
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const removePromotionCodeMutation = graphql(`
  mutation RemovePromotionCode {
    removePromotionCode {
      cart {
        ...CartDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const placeOrderMutation = graphql(`
  mutation PlaceOrder($idempotencyKey: String) {
    placeOrder(idempotencyKey: $idempotencyKey) {
      order {
        ...OrderDetail
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const registerMutation = graphql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      accessTokenExpiresAt
      customer {
        id
        name
        email
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const loginMutation = graphql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      accessTokenExpiresAt
      customer {
        id
        name
        email
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const refreshSessionMutation = graphql(`
  mutation RefreshSession {
    refreshSession {
      accessToken
      accessTokenExpiresAt
      customer {
        id
        name
        email
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const logoutMutation = graphql(`
  mutation Logout {
    logout {
      success
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const revokeSessionMutation = graphql(`
  mutation RevokeSession($sessionId: ID!) {
    revokeSession(sessionId: $sessionId) {
      sessions {
        id
        device
        createdAt
        lastUsedAt
        current
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const addToWishlistMutation = graphql(`
  mutation AddToWishlist($productId: ID!) {
    addToWishlist(productId: $productId) {
      products {
        ...ProductSummary
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);

export const removeFromWishlistMutation = graphql(`
  mutation RemoveFromWishlist($productId: ID!) {
    removeFromWishlist(productId: $productId) {
      products {
        ...ProductSummary
      }
      errors {
        ...UserErrorDetail
      }
    }
  }
`);
```

### The server side: the client, the session and the cookies

`storefrontClient.ts` is the only module that talks to the API. It builds one
Apollo Client per request with a `fetch` of its own, and that `fetch` is where
the access token, the API cookies and the `Origin` header are attached and where
the cookies the API set are read back.

**`server/storefrontClient.ts`**

```ts
import "server-only";

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import type { OperationVariables, TypedDocumentNode } from "@apollo/client";

import { graphqlEndpoint, storefrontOrigin } from "@/configuration";
import {
  buildApiCookieHeader,
  readApiCookieUpdate,
  type ApiCookieUpdate,
} from "@/server/apiCookies";
import {
  persistApiCookies,
  readApiCookies,
  readSession,
} from "@/server/session";
import type { StorefrontSession } from "@/server/sessionCipher";

export type StorefrontClient = {
  apollo: ApolloClient;
  receivedApiCookies: ApiCookieUpdate;
  session: StorefrontSession;
};

export async function createStorefrontClient(): Promise<StorefrontClient> {
  const session = await readSession();
  const apiCookies = await readApiCookies();
  const receivedApiCookies: ApiCookieUpdate = {};

  const fetchThroughSession: typeof fetch = async (target, options) => {
    const headers = new Headers(options?.headers);
    headers.set("origin", storefrontOrigin);
    if (session.accessToken !== null) {
      headers.set("authorization", `Bearer ${session.accessToken}`);
    }
    const cookieHeader = buildApiCookieHeader(apiCookies);
    if (cookieHeader !== null) {
      headers.set("cookie", cookieHeader);
    }
    const response = await fetch(target, {
      ...options,
      headers,
      cache: "no-store",
    });
    Object.assign(
      receivedApiCookies,
      readApiCookieUpdate(response.headers.getSetCookie()),
    );
    return response;
  };

  const apollo = new ApolloClient({
    link: new HttpLink({
      uri: graphqlEndpoint,
      fetch: fetchThroughSession,
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: { fetchPolicy: "no-cache" },
      mutate: { fetchPolicy: "no-cache" },
    },
  });

  return { apollo, receivedApiCookies, session };
}

function reportApiFailure(operationName: string, failure: unknown): void {
  console.error(`The Zappy Mart API refused ${operationName}`, failure);
}

export async function readFromApi<TData, TVariables extends OperationVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
): Promise<TData | null> {
  const client = await createStorefrontClient();
  try {
    const result = await client.apollo.query({ query: document, variables });
    return result.data ?? null;
  } catch (failure) {
    reportApiFailure("a read", failure);
    return null;
  }
}

export async function writeToApi<TData, TVariables extends OperationVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
): Promise<TData | null> {
  const client = await createStorefrontClient();
  try {
    const result = await client.apollo.mutate({
      mutation: document,
      variables,
    });
    await persistApiCookies(client.receivedApiCookies);
    return result.data ?? null;
  } catch (failure) {
    reportApiFailure("a write", failure);
    return null;
  }
}
```

**`server/session.ts`**

```ts
import { cookies } from "next/headers";

import { runningInProduction } from "@/configuration";
import {
  applyApiCookieUpdate,
  type ApiCookieUpdate,
  type ApiCookies,
} from "@/server/apiCookies";
import {
  decryptSession,
  emptySession,
  encryptSession,
  type StorefrontSession,
} from "@/server/sessionCipher";

export const sessionCookieName = "zappy_store_front";

const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

export async function readSession(): Promise<StorefrontSession> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(sessionCookieName);
  return stored === undefined ? emptySession : decryptSession(stored.value);
}

export async function writeSession(session: StorefrontSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, encryptSession(session), {
    httpOnly: true,
    secure: runningInProduction,
    sameSite: "lax",
    path: "/",
    maxAge: thirtyDaysInSeconds,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function readApiCookies(): Promise<ApiCookies> {
  const session = await readSession();
  return {
    refreshCookie: session.refreshCookie,
    cartCookie: session.cartCookie,
  };
}

export async function persistApiCookies(update: ApiCookieUpdate): Promise<void> {
  if (update.refreshCookie === undefined && update.cartCookie === undefined) {
    return;
  }
  const session = await readSession();
  const merged = applyApiCookieUpdate(
    { refreshCookie: session.refreshCookie, cartCookie: session.cartCookie },
    update,
  );
  await writeSession({ ...session, ...merged });
}

export async function storeAccessToken(
  accessToken: string,
  accessTokenExpiresAt: string | null,
): Promise<void> {
  const session = await readSession();
  await writeSession({ ...session, accessToken, accessTokenExpiresAt });
}

export async function forgetAccessToken(): Promise<void> {
  const session = await readSession();
  await writeSession({
    ...session,
    accessToken: null,
    accessTokenExpiresAt: null,
    refreshCookie: null,
  });
}
```

**`server/sessionCipher.ts`**

```ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { sessionSecret } from "@/configuration";

export type StorefrontSession = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshCookie: string | null;
  cartCookie: string | null;
};

export const emptySession: StorefrontSession = {
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshCookie: null,
  cartCookie: null,
};

const cipherAlgorithm = "aes-256-gcm";
const initialisationVectorLength = 12;

function encryptionKey(): Buffer {
  return createHash("sha256").update(sessionSecret, "utf8").digest();
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toSession(value: unknown): StorefrontSession {
  if (value === null || typeof value !== "object") {
    return emptySession;
  }
  const candidate = value as Record<string, unknown>;
  return {
    accessToken: readText(candidate.accessToken),
    accessTokenExpiresAt: readText(candidate.accessTokenExpiresAt),
    refreshCookie: readText(candidate.refreshCookie),
    cartCookie: readText(candidate.cartCookie),
  };
}

export function encryptSession(session: StorefrontSession): string {
  const initialisationVector = randomBytes(initialisationVectorLength);
  const cipher = createCipheriv(
    cipherAlgorithm,
    encryptionKey(),
    initialisationVector,
  );
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return [initialisationVector, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSession(value: string): StorefrontSession {
  const [vector, authenticationTag, encrypted] = value.split(".");
  if (
    vector === undefined ||
    authenticationTag === undefined ||
    encrypted === undefined
  ) {
    return emptySession;
  }
  try {
    const decipher = createDecipheriv(
      cipherAlgorithm,
      encryptionKey(),
      Buffer.from(vector, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return toSession(JSON.parse(decrypted));
  } catch {
    return emptySession;
  }
}

export function sessionIsSignedIn(session: StorefrontSession): boolean {
  return session.accessToken !== null;
}
```

**`server/apiCookies.ts`**

```ts
export const refreshCookieName = "zappy_refresh";
export const cartCookieName = "zappy_cart";

export type ApiCookies = {
  refreshCookie: string | null;
  cartCookie: string | null;
};

export type ApiCookieUpdate = {
  refreshCookie?: string | null;
  cartCookie?: string | null;
};

export function buildApiCookieHeader(cookies: ApiCookies): string | null {
  const parts: string[] = [];
  if (cookies.refreshCookie !== null) {
    parts.push(`${refreshCookieName}=${cookies.refreshCookie}`);
  }
  if (cookies.cartCookie !== null) {
    parts.push(`${cartCookieName}=${cookies.cartCookie}`);
  }
  return parts.length === 0 ? null : parts.join("; ");
}

export function readApiCookieUpdate(
  setCookieHeaders: readonly string[],
): ApiCookieUpdate {
  const update: ApiCookieUpdate = {};
  for (const header of setCookieHeaders) {
    const [assignment, ...attributes] = header.split(";");
    const separator = assignment.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const name = assignment.slice(0, separator).trim();
    const rawValue = assignment.slice(separator + 1).trim();
    const cleared =
      rawValue.length === 0 ||
      attributes.some(
        (attribute) => attribute.trim().toLowerCase() === "max-age=0",
      );
    const value = cleared ? null : rawValue;
    if (name === refreshCookieName) {
      update.refreshCookie = value;
    }
    if (name === cartCookieName) {
      update.cartCookie = value;
    }
  }
  return update;
}

export function applyApiCookieUpdate(
  cookies: ApiCookies,
  update: ApiCookieUpdate,
): ApiCookies {
  return {
    refreshCookie:
      update.refreshCookie === undefined
        ? cookies.refreshCookie
        : update.refreshCookie,
    cartCookie:
      update.cartCookie === undefined ? cookies.cartCookie : update.cartCookie,
  };
}
```

**`server/revalidation.ts`**

```ts
import { revalidatePath } from "next/cache";

export function revalidateStorefront(): void {
  revalidatePath("/", "layout");
}
```

**`server/actionState.ts`**

```ts
export type UserErrorView = {
  code: string;
  message: string;
  field: string | null;
};

export type ActionOutcome =
  | "untouched"
  | "succeeded"
  | "refused"
  | "unavailable";

export type ActionState = {
  outcome: ActionOutcome;
  errors: UserErrorView[];
  availableStock: number | null;
};

export const untouchedAction: ActionState = {
  outcome: "untouched",
  errors: [],
  availableStock: null,
};

export const succeededAction: ActionState = {
  outcome: "succeeded",
  errors: [],
  availableStock: null,
};

export const unavailableAction: ActionState = {
  outcome: "unavailable",
  errors: [
    {
      code: "API_UNAVAILABLE",
      message: "The Zappy Mart API could not be reached. Try again shortly.",
      field: null,
    },
  ],
  availableStock: null,
};

export function refusedAction(
  errors: readonly UserErrorView[],
  availableStock: number | null = null,
): ActionState {
  return {
    outcome: "refused",
    errors: errors.map((error) => ({
      code: error.code,
      message: error.message,
      field: error.field,
    })),
    availableStock,
  };
}
```

### The server side: the reads

One read module per part of the store. Each function answers with the query's
own type or with `null` when the API could not be reached, which is how a screen
tells "the API is down" apart from "there is no such product".
`catalogueSelection.ts` holds the pure function that turns the address into a
filter, with no import of the client, so the catalogue screen can be read and
tested without a server in sight.

**`server/catalogue.ts`**

```ts
import { cache } from "react";

import { catalogueSize } from "@/configuration";
import type {
  CatalogueQuery,
  CategoriesQuery,
  ProductBySlugQuery,
} from "@/graphql/generated/graphql";
import {
  catalogueQuery,
  categoriesQuery,
  productBySlugQuery,
} from "@/graphql/operations";
import type { CatalogueSelection } from "@/server/catalogueSelection";
import { readFromApi } from "@/server/storefrontClient";

export const readCategories = cache(
  async (): Promise<CategoriesQuery | null> => readFromApi(categoriesQuery, {}),
);

export async function readCatalogue(
  selection: CatalogueSelection,
): Promise<CatalogueQuery | null> {
  return readFromApi(catalogueQuery, {
    filter: {
      categorySlug: selection.categorySlug,
      nameContains: selection.searchTerm,
      inStockOnly: selection.inStockOnly,
    },
    first: catalogueSize,
    after: null,
  });
}

export async function readProduct(
  slug: string,
): Promise<ProductBySlugQuery | null> {
  return readFromApi(productBySlugQuery, { slug });
}
```

**`server/catalogueSelection.ts`**

```ts
export type CatalogueSelection = {
  categorySlug: string | null;
  searchTerm: string | null;
  inStockOnly: boolean;
};

export type SearchParameters = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  if (single === undefined) {
    return null;
  }
  const trimmed = single.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function selectionFromSearchParameters(
  parameters: SearchParameters,
): CatalogueSelection {
  return {
    categorySlug: firstValue(parameters.category),
    searchTerm: firstValue(parameters.search),
    inStockOnly: firstValue(parameters.inStockOnly) !== null,
  };
}
```

**`server/cart.ts`**

```ts
import { cache } from "react";

import type { CartContentsQuery } from "@/graphql/generated/graphql";
import { cartQuery } from "@/graphql/operations";
import { readFromApi } from "@/server/storefrontClient";

export const readCart = cache(
  async (): Promise<CartContentsQuery | null> => readFromApi(cartQuery, {}),
);

export function countCartItems(cart: CartContentsQuery | null): number {
  if (cart === null) {
    return 0;
  }
  return cart.cart.lines.reduce((total, line) => total + line.quantity, 0);
}
```

**`server/account.ts`**

```ts
import { cache } from "react";

import type {
  AccountQuery,
  SignedInCustomerQuery,
  WishlistQuery,
} from "@/graphql/generated/graphql";
import {
  accountQuery,
  signedInCustomerQuery,
  wishlistQuery,
} from "@/graphql/operations";
import { readSession } from "@/server/session";
import { readFromApi } from "@/server/storefrontClient";

export const readSignedInCustomer = cache(
  async (): Promise<SignedInCustomerQuery | null> =>
    readFromApi(signedInCustomerQuery, {}),
);

export async function readAccount(): Promise<AccountQuery | null> {
  return readFromApi(accountQuery, {});
}

export async function readWishlist(): Promise<WishlistQuery | null> {
  return readFromApi(wishlistQuery, {});
}

export async function holdsAccessToken(): Promise<boolean> {
  const session = await readSession();
  return session.accessToken !== null;
}
```

**`server/ordering.ts`**

```ts
import { orderHistorySize } from "@/configuration";
import type {
  OrderByIdQuery,
  OrderHistoryQuery,
} from "@/graphql/generated/graphql";
import { orderByIdQuery, orderHistoryQuery } from "@/graphql/operations";
import { readFromApi } from "@/server/storefrontClient";

export async function readOrderHistory(): Promise<OrderHistoryQuery | null> {
  return readFromApi(orderHistoryQuery, {
    first: orderHistorySize,
    after: null,
  });
}

export async function readOrder(
  orderId: string,
): Promise<OrderByIdQuery | null> {
  return readFromApi(orderByIdQuery, { id: orderId });
}
```

### The server side: the writes

Every mutation the store front makes. Each action reads its fields from the
`FormData` the form submitted, calls the API, and answers with an `ActionState`
that the form renders: succeeded, refused with the reasons the contract named,
or the API could not be reached. Every action that changed something ends with
`revalidateStorefront()`.

**`server/actions/cartActions.ts`**

```ts
"use server";

import {
  addToCartMutation,
  applyPromotionCodeMutation,
  changeCartLineQuantityMutation,
  removeCartLineMutation,
  removePromotionCodeMutation,
} from "@/graphql/operations";
import {
  refusedAction,
  succeededAction,
  unavailableAction,
  type ActionState,
} from "@/server/actionState";
import { revalidateStorefront } from "@/server/revalidation";
import { writeToApi } from "@/server/storefrontClient";

function readText(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
}

function readWholeNumber(form: FormData, field: string, fallback: number) {
  const parsed = Number.parseInt(readText(form, field), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function addProductToCart(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(addToCartMutation, {
    productId: readText(form, "productId"),
    quantity: readWholeNumber(form, "quantity", 1),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.addToCart.errors.length > 0) {
    return refusedAction(data.addToCart.errors, data.addToCart.availableStock);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function changeCartLineQuantity(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(changeCartLineQuantityMutation, {
    lineId: readText(form, "lineId"),
    quantity: readWholeNumber(form, "quantity", 1),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.changeCartLineQuantity.errors.length > 0) {
    return refusedAction(
      data.changeCartLineQuantity.errors,
      data.changeCartLineQuantity.availableStock,
    );
  }
  revalidateStorefront();
  return succeededAction;
}

export async function removeCartLine(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(removeCartLineMutation, {
    lineId: readText(form, "lineId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.removeCartLine.errors.length > 0) {
    return refusedAction(data.removeCartLine.errors);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function applyPromotionCode(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(applyPromotionCodeMutation, {
    code: readText(form, "code").trim(),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.applyPromotionCode.errors.length > 0) {
    return refusedAction(data.applyPromotionCode.errors);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function removePromotionCode(): Promise<void> {
  await writeToApi(removePromotionCodeMutation, {});
  revalidateStorefront();
}
```

**`server/actions/orderingActions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";

import { placeOrderMutation } from "@/graphql/operations";
import {
  refusedAction,
  unavailableAction,
  type ActionState,
} from "@/server/actionState";
import { revalidateStorefront } from "@/server/revalidation";
import { writeToApi } from "@/server/storefrontClient";

export async function placeOrder(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const idempotencyKey = form.get("idempotencyKey");
  const data = await writeToApi(placeOrderMutation, {
    idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey : null,
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.placeOrder.errors.length > 0) {
    return refusedAction(data.placeOrder.errors);
  }
  const order = data.placeOrder.order;
  if (order === null) {
    return unavailableAction;
  }
  revalidateStorefront();
  redirect(`/orders/${order.id}`);
}
```

**`server/actions/accountActions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";

import {
  loginMutation,
  logoutMutation,
  registerMutation,
  revokeSessionMutation,
} from "@/graphql/operations";
import {
  refusedAction,
  succeededAction,
  unavailableAction,
  type ActionState,
} from "@/server/actionState";
import { revalidateStorefront } from "@/server/revalidation";
import { clearSession, storeAccessToken } from "@/server/session";
import { writeToApi } from "@/server/storefrontClient";

function readText(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
}

function readDestination(form: FormData): string {
  const destination = readText(form, "destination");
  return destination.startsWith("/") ? destination : "/account";
}

export async function signIn(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const device = readText(form, "device");
  const data = await writeToApi(loginMutation, {
    input: {
      email: readText(form, "email").trim().toLowerCase(),
      password: readText(form, "password"),
      device: device.length > 0 ? device : null,
    },
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.login.errors.length > 0) {
    return refusedAction(data.login.errors);
  }
  if (data.login.accessToken === null) {
    return unavailableAction;
  }
  await storeAccessToken(
    data.login.accessToken,
    data.login.accessTokenExpiresAt,
  );
  revalidateStorefront();
  redirect(readDestination(form));
}

export async function register(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(registerMutation, {
    input: {
      email: readText(form, "email").trim().toLowerCase(),
      name: readText(form, "name").trim(),
      password: readText(form, "password"),
    },
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.register.errors.length > 0) {
    return refusedAction(data.register.errors);
  }
  if (data.register.accessToken === null) {
    return unavailableAction;
  }
  await storeAccessToken(
    data.register.accessToken,
    data.register.accessTokenExpiresAt,
  );
  revalidateStorefront();
  redirect(readDestination(form));
}

export async function signOut(): Promise<void> {
  await writeToApi(logoutMutation, {});
  await clearSession();
  revalidateStorefront();
  redirect("/");
}

export async function revokeSession(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(revokeSessionMutation, {
    sessionId: readText(form, "sessionId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.revokeSession.errors.length > 0) {
    return refusedAction(data.revokeSession.errors);
  }
  revalidateStorefront();
  return succeededAction;
}
```

**`server/actions/wishlistActions.ts`**

```ts
"use server";

import {
  addToWishlistMutation,
  removeFromWishlistMutation,
} from "@/graphql/operations";
import {
  refusedAction,
  succeededAction,
  unavailableAction,
  type ActionState,
} from "@/server/actionState";
import { revalidateStorefront } from "@/server/revalidation";
import { writeToApi } from "@/server/storefrontClient";

function readText(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
}

export async function saveProductToWishlist(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(addToWishlistMutation, {
    productId: readText(form, "productId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.addToWishlist.errors.length > 0) {
    return refusedAction(data.addToWishlist.errors);
  }
  revalidateStorefront();
  return succeededAction;
}

export async function removeProductFromWishlist(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(removeFromWishlistMutation, {
    productId: readText(form, "productId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.removeFromWishlist.errors.length > 0) {
    return refusedAction(data.removeFromWishlist.errors);
  }
  revalidateStorefront();
  return succeededAction;
}
```

### The screens

The routes stay thin. A page reads what it needs, decides what to render, and
hands the rendering to the components below. Each one names its own title, which
is what the route announcer reads out after a client side navigation.

**`app/layout.tsx`**

```tsx
import type { Metadata } from "next";

import { PoliteRouteAnnouncer } from "@/components/PoliteRouteAnnouncer";
import { SessionRefresher } from "@/components/SessionRefresher";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { readSession } from "@/server/session";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Zappy Mart", template: "%s, Zappy Mart" },
  description:
    "The Zappy Mart store front on the Next.js App Router: server components read, server actions write.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await readSession();

  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        {session.accessTokenExpiresAt === null ? null : (
          <SessionRefresher
            key={session.accessTokenExpiresAt}
            accessTokenExpiresAt={session.accessTokenExpiresAt}
          />
        )}
        <PoliteRouteAnnouncer />
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
```

**`app/globals.css`**

```css
@import "tailwindcss";
```

**`app/page.tsx`**

```tsx
import type { Metadata } from "next";

import { CatalogueFilters } from "@/components/CatalogueFilters";
import { CatalogueResults } from "@/components/CatalogueResults";
import { selectionFromSearchParameters } from "@/server/catalogueSelection";

export const metadata: Metadata = {
  title: "Catalogue",
};

export default async function CataloguePage({ searchParams }: PageProps<"/">) {
  const selection = selectionFromSearchParameters(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Catalogue</h1>
        <p className="mt-1 text-slate-700">
          Twenty products in four categories. The category and the search term
          live in the address, so a filtered catalogue is a link you can share.
        </p>
      </div>
      <CatalogueFilters
        categorySlug={selection.categorySlug}
        searchTerm={selection.searchTerm}
        inStockOnly={selection.inStockOnly}
      />
      <CatalogueResults selection={selection} />
    </div>
  );
}
```

**`app/products/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/AddToCartForm";
import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { ProductImage } from "@/components/ProductImage";
import { WishlistButton } from "@/components/WishlistButton";
import { formatMoney } from "@/formatting/money";
import { readSignedInCustomer } from "@/server/account";
import { readProduct } from "@/server/catalogue";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const answer = await readProduct(slug);
  return { title: answer?.product?.name ?? "Product" };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [answer, customer] = await Promise.all([
    readProduct(slug),
    readSignedInCustomer(),
  ]);

  if (answer === null) {
    return <ApiUnavailableNotice subject="This product" />;
  }

  const product = answer.product;
  if (product === null) {
    notFound();
  }

  const saved = (customer?.wishlist ?? []).some(
    (entry) => entry.id === product.id,
  );

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div className="flex justify-center">
        <ProductImage imageUrl={product.imageUrl} size={320} />
      </div>
      <div>
        <p className="text-sm text-slate-600">
          <Link
            href={`/?category=${product.category.slug}`}
            className="hover:underline"
          >
            {product.category.name}
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {product.name}
        </h1>
        <p className="mt-3 text-xl font-semibold text-slate-900">
          {formatMoney(product.price)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {product.stock === 0
            ? "Out of stock, and still here to read about."
            : `${product.stock} in stock`}
        </p>
        <p className="mt-4 text-slate-700">{product.description}</p>
        <AddToCartForm
          productId={product.id}
          stock={product.stock}
          withQuantity
        />
        <div className="mt-3">
          <WishlistButton productId={product.id} saved={saved} />
        </div>
      </div>
    </article>
  );
}
```

**`app/cart/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { CartLineRow } from "@/components/CartLineRow";
import { CartSummary } from "@/components/CartSummary";
import { readCart } from "@/server/cart";

export const metadata: Metadata = {
  title: "Cart",
};

export default async function CartPage() {
  const answer = await readCart();

  if (answer === null) {
    return <ApiUnavailableNotice subject="Your cart" />;
  }

  const cart = answer.cart;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Cart</h1>
      {cart.lines.length === 0 ? (
        <>
          <p className="mt-4 text-slate-700">Your cart is empty.</p>
          <p className="mt-2">
            <Link href="/" className="underline">
              Browse the catalogue
            </Link>
          </p>
        </>
      ) : (
        <>
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">The lines in your cart</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-600">
                <th scope="col" className="py-2 font-normal">
                  Product
                </th>
                <th scope="col" className="py-2 font-normal">
                  Quantity
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Line total
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Remove
                </th>
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((line) => (
                <CartLineRow key={line.id} line={line} />
              ))}
            </tbody>
          </table>
          <div className="mt-6">
            <CartSummary cart={cart} />
          </div>
          <Link
            href="/checkout"
            className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Go to checkout
          </Link>
        </>
      )}
    </div>
  );
}
```

**`app/checkout/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { CartSummary } from "@/components/CartSummary";
import { CheckoutForm } from "@/components/CheckoutForm";
import { PromotionCodeForm } from "@/components/PromotionCodeForm";
import { formatMoney } from "@/formatting/money";
import { holdsAccessToken, readSignedInCustomer } from "@/server/account";
import { readCart } from "@/server/cart";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  const [answer, signedIn] = await Promise.all([
    readCart(),
    readSignedInCustomer(),
  ]);

  if (answer === null || signedIn === null) {
    return <ApiUnavailableNotice subject="Your checkout" />;
  }

  const customer = signedIn.me;
  if (customer === null) {
    redirect(
      (await holdsAccessToken())
        ? "/login?next=/checkout&sessionEnded=true"
        : "/login?next=/checkout",
    );
  }

  const cart = answer.cart;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
      <p className="mt-1 text-slate-700">
        {customer.name}, check your order and place it.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Payment is simulated. Placing the order reserves the stock and empties
        your cart.
      </p>

      <section aria-labelledby="checkout-cart-heading" className="mt-6">
        <h2
          id="checkout-cart-heading"
          className="text-lg font-semibold text-slate-900"
        >
          What you are ordering
        </h2>
        {cart.lines.length === 0 ? (
          <>
            <p className="mt-2 text-slate-700">Your cart is empty.</p>
            <p className="mt-2">
              <Link href="/" className="underline">
                Browse the catalogue
              </Link>
            </p>
          </>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex justify-between py-2 text-sm">
                <span>
                  {line.quantity} &times; {line.product.name}
                </span>
                <span>{formatMoney(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PromotionCodeForm promotion={cart.promotion} />

      <div className="mt-6">
        <CartSummary cart={cart} />
      </div>

      <CheckoutForm
        idempotencyKey={randomUUID()}
        disabled={cart.lines.length === 0}
      />
    </div>
  );
}
```

**`app/orders/[orderId]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { OrderSummary } from "@/components/OrderSummary";
import { readOrder } from "@/server/ordering";

export const metadata: Metadata = {
  title: "Your order",
};

export default async function OrderConfirmationPage({
  params,
}: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  const answer = await readOrder(orderId);

  if (answer === null) {
    return <ApiUnavailableNotice subject="This order" />;
  }

  const order = answer.order;
  if (order === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Thank you for your order
      </h1>
      <p className="mt-1 text-slate-700">
        Keep the order number. It is what the confirmation mail carries as well.
      </p>
      <div className="mt-6">
        <OrderSummary order={order} />
      </div>
      <div className="mt-6 flex gap-4">
        <Link href="/" className="underline">
          Back to the catalogue
        </Link>
        <Link href="/account" className="underline">
          Your order history
        </Link>
      </div>
    </div>
  );
}
```

**`app/account/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { OrderSummary } from "@/components/OrderSummary";
import { ProductCard } from "@/components/ProductCard";
import { SessionList } from "@/components/SessionList";
import { formatMoment } from "@/formatting/moment";
import { holdsAccessToken, readAccount } from "@/server/account";
import { readOrderHistory } from "@/server/ordering";

export const metadata: Metadata = {
  title: "Your account",
};

export default async function AccountPage() {
  const account = await readAccount();

  if (account === null) {
    return <ApiUnavailableNotice subject="Your account" />;
  }

  const customer = account.me;
  if (customer === null) {
    if (await holdsAccessToken()) {
      redirect("/login?next=/account&sessionEnded=true");
    }
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Your account</h1>
        <p className="mt-4 text-slate-700">
          You are not logged in.{" "}
          <Link href="/login?next=/account" className="underline">
            Log in to see your orders and sessions
          </Link>
          .
        </p>
      </div>
    );
  }

  const history = await readOrderHistory();
  const orders = history?.orders.edges.map((edge) => edge.node) ?? [];

  return (
    <div className="space-y-10">
      <section aria-labelledby="account-heading">
        <h1
          id="account-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Your account
        </h1>
        <p className="mt-1 text-slate-700">
          {customer.name}, {customer.email}, registered{" "}
          {formatMoment(customer.createdAt)}
        </p>
      </section>

      <section aria-labelledby="order-history-heading">
        <h2
          id="order-history-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Order history
        </h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-slate-700">
            You have not placed an order yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderSummary order={order} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="open-sessions-heading">
        <h2
          id="open-sessions-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Open sessions
        </h2>
        <div className="mt-3">
          <SessionList sessions={customer.sessions} />
        </div>
      </section>

      <section aria-labelledby="account-wishlist-heading">
        <h2
          id="account-wishlist-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Wishlist
        </h2>
        {customer.wishlist.length === 0 ? (
          <p className="mt-2 text-slate-700">Your wishlist is empty.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customer.wishlist.map((product) => (
              <li key={product.id} className="flex">
                <ProductCard product={product} saved />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

**`app/login/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/SignInForm";
import { readSignedInCustomer } from "@/server/account";

function safeDestination(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single !== undefined && single.startsWith("/") ? single : "/account";
}

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LogInPage({ searchParams }: PageProps<"/login">) {
  const parameters = await searchParams;
  const destination = safeDestination(parameters.next);
  const sessionEnded = parameters.sessionEnded !== undefined;
  const customer = await readSignedInCustomer();

  if (customer?.me != null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-4 text-slate-700">
          You are logged in as {customer.me.name}.{" "}
          <Link href="/account" className="underline">
            Go to your account
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
      {sessionEnded ? (
        <p
          role="alert"
          className="mt-4 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Your session has ended. Please log in again.
        </p>
      ) : null}
      <p className="mt-2 text-slate-700">
        The seeded customer is jane@example.com with the password
        &quot;correct horse battery staple&quot;.
      </p>
      <div className="mt-6">
        <SignInForm destination={destination} />
      </div>
      <p className="mt-6 text-sm text-slate-700">
        No account yet?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
        .
      </p>
    </div>
  );
}
```

**`app/register/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/RegisterForm";
import { readSignedInCustomer } from "@/server/account";

function safeDestination(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single !== undefined && single.startsWith("/") ? single : "/account";
}

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const parameters = await searchParams;
  const destination = safeDestination(parameters.next);
  const customer = await readSignedInCustomer();

  if (customer?.me != null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Register</h1>
        <p className="mt-4 text-slate-700">
          You already have an account and you are logged in as{" "}
          {customer.me.name}.{" "}
          <Link href="/account" className="underline">
            Go to your account
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-slate-900">Register</h1>
      <p className="mt-2 text-slate-700">
        An account keeps your orders, your sessions and your wishlist. The cart
        and the wishlist you filled while logged out move with you.
      </p>
      <div className="mt-6">
        <RegisterForm destination={destination} />
      </div>
      <p className="mt-6 text-sm text-slate-700">
        Already registered?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
        .
      </p>
    </div>
  );
}
```

**`app/wishlist/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { ProductCard } from "@/components/ProductCard";
import { readSignedInCustomer, readWishlist } from "@/server/account";

export const metadata: Metadata = {
  title: "Your wishlist",
};

export default async function WishlistPage() {
  const [answer, customer] = await Promise.all([
    readWishlist(),
    readSignedInCustomer(),
  ]);

  if (answer === null) {
    return <ApiUnavailableNotice subject="Your wishlist" />;
  }

  const products = answer.wishlist;
  const signedIn = customer?.me != null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Your wishlist</h1>
      {signedIn ? null : (
        <p className="mt-1 text-slate-700">
          This list belongs to your browser until you sign in, and it moves to
          your account when you do.{" "}
          <Link href="/login?next=/wishlist" className="underline">
            Log in to keep it
          </Link>
          .
        </p>
      )}
      {products.length === 0 ? (
        <p className="mt-4 text-slate-700">
          Your wishlist is empty.{" "}
          <Link href="/" className="underline">
            Browse the catalogue
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id} className="flex">
              <ProductCard product={product} saved />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**`app/not-found.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFoundPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        That page is not in this store
      </h1>
      <p className="mt-2 text-slate-700">
        The catalogue holds twenty products.{" "}
        <Link href="/" className="underline">
          Start there
        </Link>
        .
      </p>
    </div>
  );
}
```

### The route handlers

`browser/sessionRefresh.ts` is the browser's half of the session endpoint: the
path, the shape of the answer and the call. The route handler is the server's
half. Both sides read the same type, so a change to one of them is a type error
in the other.

**`app/api/session/route.ts`**

```ts
import { NextResponse } from "next/server";

import type { SessionAnswer } from "@/browser/sessionRefresh";
import { storefrontOrigin } from "@/configuration";
import { refreshSessionMutation } from "@/graphql/operations";
import { clearSession, readSession, storeAccessToken } from "@/server/session";
import { writeToApi } from "@/server/storefrontClient";

const signedOut: SessionAnswer = {
  signedIn: false,
  accessTokenExpiresAt: null,
};

export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== storefrontOrigin) {
    return NextResponse.json(
      { message: "This endpoint answers the store front only." },
      { status: 403 },
    );
  }

  const session = await readSession();
  if (session.accessToken === null) {
    return NextResponse.json(signedOut);
  }

  const data = await writeToApi(refreshSessionMutation, {});
  const accessToken = data?.refreshSession.accessToken ?? null;
  if (accessToken === null) {
    await clearSession();
    return NextResponse.json(signedOut);
  }

  const accessTokenExpiresAt =
    data?.refreshSession.accessTokenExpiresAt ?? null;
  await storeAccessToken(accessToken, accessTokenExpiresAt);

  return NextResponse.json({
    signedIn: true,
    accessTokenExpiresAt,
  } satisfies SessionAnswer);
}
```

**`browser/sessionRefresh.ts`**

```ts
export type SessionAnswer = {
  signedIn: boolean;
  accessTokenExpiresAt: string | null;
};

export const sessionRefreshPath = "/api/session";

export async function requestSessionRefresh(): Promise<SessionAnswer> {
  const response = await fetch(sessionRefreshPath, { method: "POST" });
  if (!response.ok) {
    throw new Error(
      `The session endpoint answered ${response.status.toString()}`,
    );
  }
  return (await response.json()) as SessionAnswer;
}
```

**`app/images/products/[fileName]/route.ts`**

```ts
const palette = [
  "#1e293b",
  "#0f766e",
  "#7c2d12",
  "#3730a3",
  "#065f46",
  "#7e22ce",
];

function initialsOf(name: string): string {
  const words = name.split("-").filter((word) => word.length > 0);
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function colourOf(name: string): string {
  const total = [...name].reduce(
    (running, character) => running + character.charCodeAt(0),
    0,
  );
  return palette[total % palette.length];
}

export async function GET(
  request: Request,
  context: RouteContext<"/images/products/[fileName]">,
): Promise<Response> {
  const { fileName } = await context.params;
  const name = fileName.replace(/\.svg$/, "");
  const drawing = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320" role="img" aria-label="${initialsOf(name)}"><rect width="320" height="320" fill="#f1f5f9"/><circle cx="160" cy="160" r="110" fill="${colourOf(name)}"/><text x="160" y="160" fill="#ffffff" font-family="system-ui, sans-serif" font-size="96" font-weight="600" text-anchor="middle" dominant-baseline="central">${initialsOf(name)}</text></svg>`;

  return new Response(drawing, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
```

### The components

Plain Tailwind, the same layout as the other two frontends: a header with the
cart count and the wishlist, a content column of at most `max-w-5xl`, a footer.

**`components/SiteHeader.tsx`**

```tsx
import Link from "next/link";

import { SubmitButton } from "@/components/SubmitButton";
import { signOut } from "@/server/actions/accountActions";
import { readSignedInCustomer } from "@/server/account";
import { countCartItems, readCart } from "@/server/cart";

export async function SiteHeader() {
  const [customer, cart] = await Promise.all([
    readSignedInCustomer(),
    readCart(),
  ]);
  const signedIn = customer?.me != null;
  const savedProductCount = customer?.wishlist.length ?? 0;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Zappy Mart
        </Link>
        <nav aria-label="Store" className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-700 hover:underline">
            Catalogue
          </Link>
          <Link
            href="/wishlist"
            className="text-sm text-slate-700 hover:underline"
          >
            Wishlist, {savedProductCount} saved
          </Link>
          <Link href="/cart" className="text-sm text-slate-700 hover:underline">
            Cart, {countCartItems(cart)} {countCartItems(cart) === 1 ? "item" : "items"}
          </Link>
          {signedIn ? (
            <>
              <Link
                href="/account"
                className="text-sm text-slate-700 hover:underline"
              >
                Your account
              </Link>
              <form action={signOut}>
                <SubmitButton
                  label="Log out"
                  busyLabel="Logging out"
                  tone="secondary"
                />
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-slate-700 hover:underline"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

**`components/SiteFooter.tsx`**

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-600">
        <p>
          Zappy Mart, the store front on Next.js. One GraphQL contract, three
          frontends, four backends.
        </p>
        <p className="mt-1">
          Prices include nothing that a real shop would charge. This store is a
          tutorial.
        </p>
      </div>
    </footer>
  );
}
```

**`components/PoliteRouteAnnouncer.tsx`**

```tsx
"use client";

import { useInsertionEffect } from "react";

const announcerElementName = "next-route-announcer";
const announcerIdentifier = "__next-route-announcer__";
const visuallyHidden =
  "position:absolute;border:0;height:1px;margin:-1px;padding:0;width:1px;clip:rect(0 0 0 0);overflow:hidden;white-space:nowrap;word-wrap:normal";

function installPoliteAnnouncer(): void {
  if (document.getElementsByName(announcerElementName).length > 0) {
    return;
  }
  const container = document.createElement(announcerElementName);
  container.setAttribute("name", announcerElementName);
  container.style.cssText = "position:absolute";
  const announcement = document.createElement("div");
  announcement.id = announcerIdentifier;
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.style.cssText = visuallyHidden;
  container.attachShadow({ mode: "open" }).appendChild(announcement);
  document.body.appendChild(container);
}

export function PoliteRouteAnnouncer() {
  useInsertionEffect(() => {
    installPoliteAnnouncer();
  }, []);
  return null;
}
```

**`components/CatalogueFilters.tsx`**

```tsx
import { readCategories } from "@/server/catalogue";

export async function CatalogueFilters({
  categorySlug,
  searchTerm,
  inStockOnly,
}: {
  categorySlug: string | null;
  searchTerm: string | null;
  inStockOnly: boolean;
}) {
  const answer = await readCategories();
  const categories = answer?.categories ?? [];

  return (
    <form
      role="search"
      method="get"
      action="/"
      className="flex flex-wrap items-end gap-4 rounded border border-slate-200 bg-white p-4"
    >
      <div>
        <label
          htmlFor="catalogue-search"
          className="block text-xs font-medium text-slate-600"
        >
          Search by name
        </label>
        <input
          id="catalogue-search"
          name="search"
          type="search"
          defaultValue={searchTerm ?? ""}
          placeholder="jacket"
          className="mt-1 w-56 rounded border border-slate-400 px-2 py-2 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="catalogue-category"
          className="block text-xs font-medium text-slate-600"
        >
          Category
        </label>
        <select
          id="catalogue-category"
          name="category"
          defaultValue={categorySlug ?? ""}
          className="mt-1 rounded border border-slate-400 px-2 py-2 text-sm"
        >
          <option value="">Every category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 pb-2">
        <input
          id="catalogue-in-stock-only"
          name="inStockOnly"
          type="checkbox"
          value="true"
          defaultChecked={inStockOnly}
          className="size-4 rounded border-slate-400"
        />
        <label
          htmlFor="catalogue-in-stock-only"
          className="text-sm text-slate-700"
        >
          In stock only
        </label>
      </div>
      <button
        type="submit"
        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Filter
      </button>
    </form>
  );
}
```

**`components/CatalogueResults.tsx`**

```tsx
import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { ProductCard } from "@/components/ProductCard";
import { readSignedInCustomer } from "@/server/account";
import { readCatalogue } from "@/server/catalogue";
import type { CatalogueSelection } from "@/server/catalogueSelection";

export async function CatalogueResults({
  selection,
}: {
  selection: CatalogueSelection;
}) {
  const [catalogue, customer] = await Promise.all([
    readCatalogue(selection),
    readSignedInCustomer(),
  ]);

  if (catalogue === null) {
    return <ApiUnavailableNotice subject="The catalogue" />;
  }

  const products = catalogue.products.edges.map((edge) => edge.node);
  const savedProductIds = new Set(
    (customer?.wishlist ?? []).map((product) => product.id),
  );

  if (products.length === 0) {
    return (
      <p role="status" className="text-slate-700">
        No product matches that filter.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        {catalogue.products.totalCount} products match.
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.id} className="flex">
            <ProductCard
              product={product}
              saved={savedProductIds.has(product.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**`components/ProductCard.tsx`**

```tsx
import Link from "next/link";

import { AddToCartForm } from "@/components/AddToCartForm";
import { ProductImage } from "@/components/ProductImage";
import { WishlistButton } from "@/components/WishlistButton";
import { formatMoney } from "@/formatting/money";
import type { ProductSummaryFragment } from "@/graphql/generated/graphql";

export function ProductCard({
  product,
  saved,
}: {
  product: ProductSummaryFragment;
  saved: boolean;
}) {
  return (
    <article className="flex w-full flex-col rounded border border-slate-200 bg-white p-4">
      <div className="self-center">
        <ProductImage imageUrl={product.imageUrl} size={160} />
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">
        <Link href={`/products/${product.slug}`} className="hover:underline">
          {product.name}
        </Link>
      </h3>
      <p className="text-sm text-slate-600">{product.category.name}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">
        {formatMoney(product.price)}
      </p>
      <p className="text-sm text-slate-600">
        {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
      </p>
      <div className="mt-auto">
        <AddToCartForm productId={product.id} stock={product.stock} />
        <div className="mt-2">
          <WishlistButton productId={product.id} saved={saved} />
        </div>
      </div>
    </article>
  );
}
```

**`components/ProductImage.tsx`**

```tsx
import Image from "next/image";

export function ProductImage({
  imageUrl,
  size,
}: {
  imageUrl: string | null;
  size: number;
}) {
  return (
    <Image
      src={imageUrl ?? "/images/products/unknown.svg"}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="rounded bg-slate-100 object-contain"
    />
  );
}
```

**`components/AddToCartForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { addProductToCart } from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

export function AddToCartForm({
  productId,
  stock,
  withQuantity = false,
}: {
  productId: string;
  stock: number;
  withQuantity?: boolean;
}) {
  const [state, submit] = useActionState(addProductToCart, untouchedAction);
  const soldOut = stock === 0;
  const quantityFieldId = `quantity-${productId}`;

  return (
    <form action={submit} className="mt-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-end gap-2">
        {withQuantity ? (
          <div>
            <label
              htmlFor={quantityFieldId}
              className="block text-xs font-medium text-slate-600"
            >
              Quantity
            </label>
            <input
              id={quantityFieldId}
              name="quantity"
              type="number"
              min={1}
              max={Math.max(stock, 1)}
              defaultValue={1}
              disabled={soldOut}
              className="mt-1 w-20 rounded border border-slate-400 px-2 py-1 text-sm"
            />
          </div>
        ) : (
          <input type="hidden" name="quantity" value="1" />
        )}
        <SubmitButton
          label={soldOut ? "Out of stock" : "Add to cart"}
          busyLabel="Adding"
          disabled={soldOut}
        />
      </div>
      {state.outcome === "succeeded" ? (
        <p role="status" className="mt-2 text-sm text-emerald-700">
          Added to your cart.
        </p>
      ) : null}
      <UserErrorMessages
        errors={state.errors}
        availableStock={state.availableStock}
      />
    </form>
  );
}
```

**`components/WishlistButton.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import {
  removeProductFromWishlist,
  saveProductToWishlist,
} from "@/server/actions/wishlistActions";
import { untouchedAction } from "@/server/actionState";

export function WishlistButton({
  productId,
  saved,
}: {
  productId: string;
  saved: boolean;
}) {
  const [state, submit] = useActionState(
    saved ? removeProductFromWishlist : saveProductToWishlist,
    untouchedAction,
  );

  return (
    <form action={submit}>
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton
        label={saved ? "Remove from wishlist" : "Save to wishlist"}
        busyLabel="Saving"
        tone="secondary"
      />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
```

**`components/CartLineRow.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { formatMoney } from "@/formatting/money";
import type { CartDetailFragment } from "@/graphql/generated/graphql";
import {
  changeCartLineQuantity,
  removeCartLine,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

export function CartLineRow({
  line,
}: {
  line: CartDetailFragment["lines"][number];
}) {
  const [quantityState, changeQuantity] = useActionState(
    changeCartLineQuantity,
    untouchedAction,
  );
  const [removalState, remove] = useActionState(removeCartLine, untouchedAction);
  const quantityFieldId = `line-quantity-${line.id}`;

  return (
    <tr className="border-b border-slate-200 align-top">
      <th scope="row" className="py-4 text-left font-medium text-slate-900">
        {line.product.name}
        <span className="block text-sm font-normal text-slate-600">
          {formatMoney(line.product.price)} each
        </span>
      </th>
      <td className="py-4">
        <form action={changeQuantity} className="flex items-center gap-2">
          <input type="hidden" name="lineId" value={line.id} />
          <label htmlFor={quantityFieldId} className="sr-only">
            Quantity of {line.product.name}
          </label>
          <input
            id={quantityFieldId}
            name="quantity"
            type="number"
            min={1}
            defaultValue={line.quantity}
            className="w-20 rounded border border-slate-400 px-2 py-1 text-sm"
          />
          <SubmitButton label="Update" busyLabel="Updating" tone="secondary" />
        </form>
        <UserErrorMessages
          errors={quantityState.errors}
          availableStock={quantityState.availableStock}
        />
      </td>
      <td className="py-4 text-right font-medium text-slate-900">
        {formatMoney(line.lineTotal)}
      </td>
      <td className="py-4 text-right">
        <form action={remove}>
          <input type="hidden" name="lineId" value={line.id} />
          <SubmitButton
            label={`Remove ${line.product.name}`}
            busyLabel="Removing"
            tone="secondary"
          />
        </form>
        <UserErrorMessages errors={removalState.errors} />
      </td>
    </tr>
  );
}
```

**`components/CartSummary.tsx`**

```tsx
import { formatMoney } from "@/formatting/money";
import type { CartDetailFragment } from "@/graphql/generated/graphql";

export function CartSummary({ cart }: { cart: CartDetailFragment }) {
  return (
    <table className="w-full max-w-sm text-sm">
      <caption className="text-left text-sm font-semibold text-slate-900">
        Totals
      </caption>
      <tbody>
        <tr>
          <th scope="row" className="py-1 text-left font-normal text-slate-600">
            Subtotal
          </th>
          <td className="py-1 text-right">{formatMoney(cart.subtotal)}</td>
        </tr>
        <tr>
          <th scope="row" className="py-1 text-left font-normal text-slate-600">
            Shipping
          </th>
          <td className="py-1 text-right">{formatMoney(cart.shipping)}</td>
        </tr>
        {cart.promotion === null ? null : (
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Discount, {cart.promotion.code}
            </th>
            <td className="py-1 text-right">
              {formatMoney(cart.promotion.discount)}
            </td>
          </tr>
        )}
        <tr className="border-t border-slate-300">
          <th scope="row" className="py-2 text-left font-semibold">
            Total
          </th>
          <td className="py-2 text-right font-semibold">
            {formatMoney(cart.total)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
```

**`components/PromotionCodeForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { formatMoney } from "@/formatting/money";
import type { CartDetailFragment } from "@/graphql/generated/graphql";
import {
  applyPromotionCode,
  removePromotionCode,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

function promotionSentence(
  promotion: NonNullable<CartDetailFragment["promotion"]>,
): string {
  if (promotion.kind === "FREE_SHIPPING") {
    return `${promotion.code} makes the shipping free.`;
  }
  return `${promotion.code} takes off ${formatMoney(promotion.discount)}.`;
}

export function PromotionCodeForm({
  promotion,
}: {
  promotion: CartDetailFragment["promotion"];
}) {
  const [applyState, apply] = useActionState(
    applyPromotionCode,
    untouchedAction,
  );

  return (
    <section aria-labelledby="promotion-code-heading" className="mt-6">
      <h2
        id="promotion-code-heading"
        className="text-sm font-semibold text-slate-900"
      >
        Promotion code
      </h2>
      {promotion === null ? (
        <form action={apply} className="mt-2 flex items-end gap-2">
          <div>
            <label
              htmlFor="promotion-code"
              className="block text-xs font-medium text-slate-600"
            >
              Promotion code
            </label>
            <input
              id="promotion-code"
              name="code"
              type="text"
              autoComplete="off"
              className="mt-1 w-44 rounded border border-slate-400 px-2 py-1 text-sm uppercase"
            />
          </div>
          <SubmitButton label="Apply code" busyLabel="Applying" tone="secondary" />
        </form>
      ) : (
        <form action={removePromotionCode} className="mt-2 flex items-center gap-3">
          <p className="text-sm text-slate-700">{promotionSentence(promotion)}</p>
          <SubmitButton label="Remove code" busyLabel="Removing" tone="secondary" />
        </form>
      )}
      <UserErrorMessages errors={applyState.errors} />
    </section>
  );
}
```

**`components/CheckoutForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { placeOrder } from "@/server/actions/orderingActions";
import { untouchedAction } from "@/server/actionState";

export function CheckoutForm({
  idempotencyKey,
  disabled,
}: {
  idempotencyKey: string;
  disabled: boolean;
}) {
  const [state, submit] = useActionState(placeOrder, untouchedAction);

  return (
    <form action={submit} className="mt-6">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <SubmitButton
        label="Place order"
        busyLabel="Placing your order"
        disabled={disabled}
      />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
```

**`components/OrderSummary.tsx`**

```tsx
import { formatMoney } from "@/formatting/money";
import { formatMoment } from "@/formatting/moment";
import type { OrderDetailFragment } from "@/graphql/generated/graphql";

export function OrderSummary({ order }: { order: OrderDetailFragment }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">
        Order {order.number}
      </h3>
      <p className="text-sm text-slate-600">
        Placed {formatMoment(order.placedAt)}, status {order.status.toLowerCase()}
      </p>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Order lines</caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th scope="col" className="py-1 font-normal">
              Product
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Unit price
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Quantity
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Line total
            </th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.productName} className="border-b border-slate-100">
              <td className="py-1">{line.productName}</td>
              <td className="py-1 text-right">{formatMoney(line.unitPrice)}</td>
              <td className="py-1 text-right">{line.quantity}</td>
              <td className="py-1 text-right">{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="mt-4 w-full max-w-sm text-sm">
        <caption className="text-left text-sm font-semibold text-slate-900">
          Totals
        </caption>
        <tbody>
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Subtotal
            </th>
            <td className="py-1 text-right">{formatMoney(order.subtotal)}</td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Shipping
            </th>
            <td className="py-1 text-right">{formatMoney(order.shipping)}</td>
          </tr>
          {order.promotionCode === null ? null : (
            <tr>
              <th
                scope="row"
                className="py-1 text-left font-normal text-slate-600"
              >
                Promotion code
              </th>
              <td className="py-1 text-right">{order.promotionCode}</td>
            </tr>
          )}
          <tr>
            <th
              scope="row"
              className="py-1 text-left font-normal text-slate-600"
            >
              Discount
            </th>
            <td className="py-1 text-right">{formatMoney(order.discount)}</td>
          </tr>
          <tr className="border-t border-slate-300">
            <th scope="row" className="py-2 text-left font-semibold">
              Total
            </th>
            <td className="py-2 text-right font-semibold">
              {formatMoney(order.total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

**`components/SignInForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { signIn } from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

export function SignInForm({ destination }: { destination: string }) {
  const [state, submit] = useActionState(signIn, untouchedAction);

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="destination" value={destination} />
      <div>
        <label
          htmlFor="log-in-email"
          className="block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <input
          id="log-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="log-in-password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="log-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="log-in-device"
          className="block text-sm font-medium text-slate-700"
        >
          Device description
        </label>
        <input
          id="log-in-device"
          name="device"
          type="text"
          placeholder="Chrome on Windows"
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-600">
          It labels this login in your session list, so you recognise it later.
        </p>
      </div>
      <SubmitButton label="Log in" busyLabel="Logging in" />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
```

**`components/RegisterForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { register } from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

export function RegisterForm({ destination }: { destination: string }) {
  const [state, submit] = useActionState(register, untouchedAction);

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="destination" value={destination} />
      <div>
        <label
          htmlFor="register-name"
          className="block text-sm font-medium text-slate-700"
        >
          Name
        </label>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="register-email"
          className="block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-600">
          At least twelve characters, as the security model asks for.
        </p>
      </div>
      <SubmitButton label="Register" busyLabel="Registering" />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
```

**`components/SessionList.tsx`**

```tsx
"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { formatMoment } from "@/formatting/moment";
import type { AccountQuery } from "@/graphql/generated/graphql";
import { revokeSession } from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

type CustomerSession = NonNullable<AccountQuery["me"]>["sessions"][number];

export function SessionList({
  sessions,
}: {
  sessions: readonly CustomerSession[];
}) {
  const [state, revoke] = useActionState(revokeSession, untouchedAction);

  return (
    <div>
      <ul className="divide-y divide-slate-200">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="font-medium text-slate-900">
                {session.device}
                {session.current ? " (this device)" : ""}
              </p>
              <p className="text-sm text-slate-600">
                Signed in {formatMoment(session.createdAt)}, last used{" "}
                {formatMoment(session.lastUsedAt)}
              </p>
            </div>
            <form action={revoke}>
              <input type="hidden" name="sessionId" value={session.id} />
              <SubmitButton
                label={`Revoke ${session.device}`}
                busyLabel="Revoking"
                tone="secondary"
              />
            </form>
          </li>
        ))}
      </ul>
      <UserErrorMessages errors={state.errors} />
    </div>
  );
}
```

**`components/SessionRefresher.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { requestSessionRefresh } from "@/browser/sessionRefresh";

const refreshMarginInMilliseconds = 60_000;

export function SessionRefresher({
  accessTokenExpiresAt,
}: {
  accessTokenExpiresAt: string;
}) {
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState<string | null>(
    accessTokenExpiresAt,
  );

  useEffect(() => {
    if (expiresAt === null) {
      return;
    }
    const wait = Math.max(
      new Date(expiresAt).getTime() - Date.now() - refreshMarginInMilliseconds,
      0,
    );
    const timer = window.setTimeout(() => {
      requestSessionRefresh()
        .then((answer) => {
          setExpiresAt(answer.accessTokenExpiresAt);
          if (!answer.signedIn) {
            router.refresh();
          }
        })
        .catch(() => {
          setExpiresAt(null);
        });
    }, wait);
    return () => {
      window.clearTimeout(timer);
    };
  }, [expiresAt, router]);

  return null;
}
```

**`components/SubmitButton.tsx`**

```tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  busyLabel,
  disabled = false,
  tone = "primary",
}: {
  label: string;
  busyLabel?: string;
  disabled?: boolean;
  tone?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const toneClasses =
    tone === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400"
      : "border border-slate-400 text-slate-700 hover:bg-slate-100 disabled:text-slate-400";
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`rounded px-3 py-2 text-sm font-medium transition ${toneClasses}`}
    >
      {pending && busyLabel !== undefined ? busyLabel : label}
    </button>
  );
}
```

**`components/UserErrorMessages.tsx`**

```tsx
import { describeUserError } from "@/formatting/userErrorText";
import type { UserErrorView } from "@/server/actionState";

export function UserErrorMessages({
  errors,
  availableStock = null,
}: {
  errors: readonly UserErrorView[];
  availableStock?: number | null;
}) {
  if (errors.length === 0) {
    return null;
  }
  return (
    <ul role="alert" className="mt-2 space-y-1 text-sm text-red-700">
      {errors.map((error) => (
        <li key={`${error.code}-${error.field ?? "operation"}`}>
          {describeUserError(error, availableStock)}
        </li>
      ))}
    </ul>
  );
}
```

**`components/ApiUnavailableNotice.tsx`**

```tsx
export function ApiUnavailableNotice({ subject }: { subject: string }) {
  return (
    <div
      role="status"
      className="rounded border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-medium">The Zappy Mart API did not answer.</p>
      <p className="mt-1">
        {subject} could not be loaded. Start a backend from the repository, or
        the mock server in <code>tools/mock-server</code>, and reload this page.
      </p>
    </div>
  );
}
```

### Formatting

`Money` is an integer in cents everywhere in the contract, and `formatMoney` is
the one place it becomes text. `userErrorText.ts` is the store front's own
sentence per `UserErrorCode`. The contract says a client switches on the code
and never on the message, and this is where that promise is kept.

**`formatting/money.ts`**

```ts
export type MoneyValue = {
  amount: number;
  currency: string;
};

export function formatMoney(money: MoneyValue): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: money.currency,
  }).format(money.amount / 100);
}
```

**`formatting/moment.ts`**

```ts
export function formatMoment(moment: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(moment));
}
```

**`formatting/userErrorText.ts`**

```ts
import type { UserErrorView } from "@/server/actionState";

const sentenceByCode: Record<string, string> = {
  API_UNAVAILABLE: "The Zappy Mart API could not be reached. Try again shortly.",
  PRODUCT_NOT_FOUND: "That product is no longer in the catalogue.",
  OUT_OF_STOCK: "There is not enough stock for that quantity.",
  QUANTITY_INVALID: "A quantity has to be one or more.",
  CART_LINE_NOT_FOUND: "That line is no longer in your cart.",
  CART_EMPTY: "Your cart is empty, so there is nothing to order.",
  CODE_UNKNOWN: "That promotion code does not exist.",
  CODE_EXPIRED: "That promotion code is outside its validity window.",
  CODE_EXHAUSTED: "That promotion code has reached its usage limit.",
  CODE_MINIMUM_NOT_MET:
    "Your cart is below the minimum this promotion code asks for.",
  EMAIL_TAKEN: "An account with that email address already exists.",
  EMAIL_INVALID: "That is not a valid email address.",
  PASSWORD_TOO_SHORT: "A password needs at least twelve characters.",
  PASSWORD_TOO_LONG: "A password takes at most one hundred and twenty eight characters.",
  CREDENTIALS_INVALID: "That email address and password do not match an account.",
  RATE_LIMITED: "Too many attempts. Wait a moment and try again.",
  SESSION_INVALID: "Your session has ended. Please log in again.",
  SESSION_NOT_FOUND: "That session has already ended.",
  NOT_AUTHENTICATED: "Log in to continue.",
  ORDER_NOT_FOUND: "That order does not belong to this account.",
};

export function describeUserError(
  error: UserErrorView,
  availableStock: number | null = null,
): string {
  const sentence = sentenceByCode[error.code] ?? error.message;
  if (error.code === "OUT_OF_STOCK" && availableStock !== null) {
    return `${sentence} ${availableStock} left in stock.`;
  }
  return sentence;
}
```

### The tests

`seedFixtures.ts` holds the products, the cart, the order and the customer of
`contract/seed/`, so a test reads like the store it is testing.

**`tests/support/seedFixtures.ts`**

```ts
import type {
  AccountQuery,
  CartDetailFragment,
  OrderDetailFragment,
  ProductDetailFragment,
  ProductSummaryFragment,
} from "@/graphql/generated/graphql";

const menswear = {
  id: "category-mens-clothing",
  name: "Men's clothing",
  slug: "mens-clothing",
};

export const backpack: ProductSummaryFragment = {
  id: "product-01",
  name: "Fjallraven Foldsack No. 1 Backpack, Fits 15 Laptops",
  slug: "fjallraven-foldsack-no-1-backpack",
  stock: 12,
  imageUrl: "/images/products/fjallraven-foldsack-no-1-backpack.svg",
  price: { amount: 10995, currency: "EUR" },
  category: menswear,
};

export const cottonJacket: ProductDetailFragment = {
  id: "product-03",
  name: "Mens Cotton Jacket",
  slug: "mens-cotton-jacket",
  description: "Great outerwear jackets for spring, autumn and winter.",
  stock: 8,
  imageUrl: "/images/products/mens-cotton-jacket.svg",
  price: { amount: 5599, currency: "EUR" },
  category: menswear,
};

export const princessRing: ProductSummaryFragment = {
  id: "product-07",
  name: "White Gold Plated Princess",
  slug: "white-gold-plated-princess",
  stock: 0,
  imageUrl: "/images/products/white-gold-plated-princess.svg",
  price: { amount: 999, currency: "EUR" },
  category: { id: "category-jewellery", name: "Jewellery", slug: "jewellery" },
};

export const filledCart: CartDetailFragment = {
  id: "cart-1",
  updatedAt: "2026-09-09T10:00:00Z",
  subtotal: { amount: 10995, currency: "EUR" },
  shipping: { amount: 0, currency: "EUR" },
  total: { amount: 10995, currency: "EUR" },
  promotion: null,
  lines: [
    {
      id: "line-1",
      quantity: 1,
      lineTotal: { amount: 10995, currency: "EUR" },
      product: backpack,
    },
  ],
};

export const emptyCart: CartDetailFragment = {
  ...filledCart,
  subtotal: { amount: 0, currency: "EUR" },
  shipping: { amount: 495, currency: "EUR" },
  total: { amount: 495, currency: "EUR" },
  lines: [],
};

export const placedOrder: OrderDetailFragment = {
  id: "order-1",
  number: "ZM-1001",
  status: "PAID",
  promotionCode: "WELCOME10",
  placedAt: "2026-09-09T10:05:00Z",
  subtotal: { amount: 10995, currency: "EUR" },
  discount: { amount: 1100, currency: "EUR" },
  shipping: { amount: 0, currency: "EUR" },
  total: { amount: 9895, currency: "EUR" },
  lines: [
    {
      productName: backpack.name,
      quantity: 1,
      unitPrice: { amount: 10995, currency: "EUR" },
      lineTotal: { amount: 10995, currency: "EUR" },
    },
  ],
};

export const signedInCustomer: NonNullable<AccountQuery["me"]> = {
  id: "customer-01",
  name: "Jane Doe",
  email: "jane@example.com",
  createdAt: "2026-01-15T09:00:00Z",
  sessions: [
    {
      id: "session-1",
      device: "Chrome on Windows",
      createdAt: "2026-09-09T09:00:00Z",
      lastUsedAt: "2026-09-09T10:00:00Z",
      current: true,
    },
    {
      id: "session-2",
      device: "Safari on iPhone",
      createdAt: "2026-09-01T09:00:00Z",
      lastUsedAt: "2026-09-02T09:00:00Z",
      current: false,
    },
  ],
  wishlist: [backpack],
};
```

**`tests/units/sessionCipher.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import {
  decryptSession,
  emptySession,
  encryptSession,
  sessionIsSignedIn,
} from "@/server/sessionCipher";

const session = {
  accessToken: "a-json-web-token",
  accessTokenExpiresAt: "2026-09-09T12:15:00Z",
  refreshCookie: "refresh-1",
  cartCookie: "cart-1",
};

describe("the encrypted session cookie", () => {
  it("comes back as it went in", () => {
    expect(decryptSession(encryptSession(session))).toEqual(session);
  });

  it("hides the tokens in the cookie value", () => {
    const encrypted = encryptSession(session);
    expect(encrypted).not.toContain("a-json-web-token");
    expect(encrypted).not.toContain("refresh-1");
  });

  it("reads a tampered value as no session at all", () => {
    const encrypted = encryptSession(session);
    const tampered = `${encrypted.slice(0, -4)}abcd`;
    expect(decryptSession(tampered)).toEqual(emptySession);
  });

  it("reads a value of the wrong shape as no session at all", () => {
    expect(decryptSession("not-a-session")).toEqual(emptySession);
  });

  it("knows a signed in visitor by the access token", () => {
    expect(sessionIsSignedIn(session)).toBe(true);
    expect(sessionIsSignedIn(emptySession)).toBe(false);
  });
});
```

**`tests/units/apiCookies.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import {
  applyApiCookieUpdate,
  buildApiCookieHeader,
  readApiCookieUpdate,
} from "@/server/apiCookies";

describe("the api cookie header the store front sends", () => {
  it("names only the cookies it holds", () => {
    expect(
      buildApiCookieHeader({ refreshCookie: "refresh-1", cartCookie: null }),
    ).toBe("zappy_refresh=refresh-1");
  });

  it("is empty when the visitor is new", () => {
    expect(
      buildApiCookieHeader({ refreshCookie: null, cartCookie: null }),
    ).toBeNull();
  });

  it("carries both cookies once they exist", () => {
    expect(
      buildApiCookieHeader({ refreshCookie: "refresh-1", cartCookie: "cart-1" }),
    ).toBe("zappy_refresh=refresh-1; zappy_cart=cart-1");
  });
});

describe("reading what the api set", () => {
  it("keeps the value of a cookie the api set", () => {
    expect(
      readApiCookieUpdate([
        "zappy_cart=cart-9; Path=/; HttpOnly; SameSite=Lax",
        "unrelated=value; Path=/",
      ]),
    ).toEqual({ cartCookie: "cart-9" });
  });

  it("reads a cleared cookie as gone", () => {
    expect(
      readApiCookieUpdate(["zappy_refresh=; Path=/; Max-Age=0"]),
    ).toEqual({ refreshCookie: null });
  });

  it("leaves a cookie the answer did not mention untouched", () => {
    const merged = applyApiCookieUpdate(
      { refreshCookie: "refresh-1", cartCookie: "cart-1" },
      { cartCookie: "cart-2" },
    );
    expect(merged).toEqual({
      refreshCookie: "refresh-1",
      cartCookie: "cart-2",
    });
  });
});
```

**`tests/units/politeRouteAnnouncer.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { PoliteRouteAnnouncer } from "@/components/PoliteRouteAnnouncer";

function announcerElement(): Element | null {
  const container = document.getElementsByName("next-route-announcer")[0];
  return container?.shadowRoot?.firstElementChild ?? null;
}

describe("the route announcer the store front installs", () => {
  beforeEach(() => {
    for (const container of Array.from(
      document.getElementsByTagName("next-route-announcer"),
    )) {
      container.remove();
    }
  });

  it("announces politely and carries no live region role", () => {
    render(<PoliteRouteAnnouncer />);

    const announcer = announcerElement();
    expect(announcer).not.toBeNull();
    expect(announcer).toHaveAttribute("aria-live", "polite");
    expect(announcer).toHaveAttribute("aria-atomic", "true");
    expect(announcer).not.toHaveAttribute("role");
  });

  it("leaves an alert on the screen as the only alert", () => {
    render(
      <>
        <PoliteRouteAnnouncer />
        <p role="alert">Your session has ended. Please log in again.</p>
      </>,
    );

    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("installs one announcer even when it is rendered twice", () => {
    render(
      <>
        <PoliteRouteAnnouncer />
        <PoliteRouteAnnouncer />
      </>,
    );

    expect(
      document.getElementsByTagName("next-route-announcer"),
    ).toHaveLength(1);
  });
});
```

**`tests/actions/cartActions.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  writeToApi: vi.fn(),
  revalidateStorefront: vi.fn(),
}));

vi.mock("@/server/storefrontClient", () => ({
  writeToApi: mocked.writeToApi,
  readFromApi: vi.fn(),
}));

vi.mock("@/server/revalidation", () => ({
  revalidateStorefront: mocked.revalidateStorefront,
}));

import {
  addProductToCart,
  applyPromotionCode,
  changeCartLineQuantity,
  removeCartLine,
  removePromotionCode,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("adding a product to the cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the product and the quantity and invalidates the screens", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToCart: { availableStock: null, cart: { id: "cart-1" }, errors: [] },
    });

    const state = await addProductToCart(
      untouchedAction,
      formWith({ productId: "product-01", quantity: "2" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      productId: "product-01",
      quantity: 2,
    });
    expect(state.outcome).toBe("succeeded");
    expect(mocked.revalidateStorefront).toHaveBeenCalledOnce();
  });

  it("hands back the refusal and the stock that is left", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToCart: {
        availableStock: 1,
        cart: { id: "cart-1" },
        errors: [
          { code: "OUT_OF_STOCK", message: "Only one left.", field: null },
        ],
      },
    });

    const state = await addProductToCart(
      untouchedAction,
      formWith({ productId: "product-12", quantity: "2" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("OUT_OF_STOCK");
    expect(state.availableStock).toBe(1);
    expect(mocked.revalidateStorefront).not.toHaveBeenCalled();
  });

  it("says the api is unavailable when the call fails", async () => {
    mocked.writeToApi.mockResolvedValue(null);

    const state = await addProductToCart(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(state.outcome).toBe("unavailable");
  });
});

describe("changing the quantity of a cart line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the line and the exact quantity", async () => {
    mocked.writeToApi.mockResolvedValue({
      changeCartLineQuantity: {
        availableStock: null,
        cart: { id: "cart-1" },
        errors: [],
      },
    });

    const state = await changeCartLineQuantity(
      untouchedAction,
      formWith({ lineId: "line-1", quantity: "3" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      lineId: "line-1",
      quantity: 3,
    });
    expect(state.outcome).toBe("succeeded");
  });
});

describe("removing a cart line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the line id", async () => {
    mocked.writeToApi.mockResolvedValue({
      removeCartLine: { cart: { id: "cart-1" }, errors: [] },
    });

    const state = await removeCartLine(
      untouchedAction,
      formWith({ lineId: "line-1" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      lineId: "line-1",
    });
    expect(state.outcome).toBe("succeeded");
  });
});

describe("applying a promotion code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims what the visitor typed", async () => {
    mocked.writeToApi.mockResolvedValue({
      applyPromotionCode: { cart: { id: "cart-1" }, errors: [] },
    });

    await applyPromotionCode(untouchedAction, formWith({ code: "  welcome10 " }));

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      code: "welcome10",
    });
  });

  it("hands back an expired code as a refusal", async () => {
    mocked.writeToApi.mockResolvedValue({
      applyPromotionCode: {
        cart: { id: "cart-1" },
        errors: [
          { code: "CODE_EXPIRED", message: "Outside its window.", field: null },
        ],
      },
    });

    const state = await applyPromotionCode(
      untouchedAction,
      formWith({ code: "SUMMER2025" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("CODE_EXPIRED");
  });
});

describe("removing the promotion code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks the api and invalidates the screens", async () => {
    mocked.writeToApi.mockResolvedValue({
      removePromotionCode: { cart: { id: "cart-1" }, errors: [] },
    });

    await removePromotionCode();

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {});
    expect(mocked.revalidateStorefront).toHaveBeenCalledOnce();
  });
});
```

**`tests/actions/orderingActions.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  writeToApi: vi.fn(),
  revalidateStorefront: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/server/storefrontClient", () => ({
  writeToApi: mocked.writeToApi,
  readFromApi: vi.fn(),
}));

vi.mock("@/server/revalidation", () => ({
  revalidateStorefront: mocked.revalidateStorefront,
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import { placeOrder } from "@/server/actions/orderingActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("placing an order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the idempotency key and goes to the confirmation screen", async () => {
    mocked.writeToApi.mockResolvedValue({
      placeOrder: {
        order: { id: "order-1", number: "ZM-1001" },
        errors: [],
      },
    });

    await placeOrder(untouchedAction, formWith({ idempotencyKey: "attempt-1" }));

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: "attempt-1",
    });
    expect(mocked.revalidateStorefront).toHaveBeenCalledOnce();
    expect(mocked.redirect).toHaveBeenCalledWith("/orders/order-1");
  });

  it("hands back an empty cart as a refusal and stays on the checkout", async () => {
    mocked.writeToApi.mockResolvedValue({
      placeOrder: {
        order: null,
        errors: [
          { code: "CART_EMPTY", message: "Nothing to order.", field: null },
        ],
      },
    });

    const state = await placeOrder(
      untouchedAction,
      formWith({ idempotencyKey: "attempt-2" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("CART_EMPTY");
    expect(mocked.redirect).not.toHaveBeenCalled();
  });
});
```

**`tests/actions/accountActions.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  writeToApi: vi.fn(),
  revalidateStorefront: vi.fn(),
  storeAccessToken: vi.fn(),
  clearSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/server/storefrontClient", () => ({
  writeToApi: mocked.writeToApi,
  readFromApi: vi.fn(),
}));

vi.mock("@/server/revalidation", () => ({
  revalidateStorefront: mocked.revalidateStorefront,
}));

vi.mock("@/server/session", () => ({
  storeAccessToken: mocked.storeAccessToken,
  clearSession: mocked.clearSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import {
  register,
  revokeSession,
  signIn,
  signOut,
} from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("signing in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalises the address, keeps the access token and reports success", async () => {
    mocked.writeToApi.mockResolvedValue({
      login: {
        accessToken: "a-json-web-token",
        accessTokenExpiresAt: "2026-09-09T12:15:00Z",
        customer: {
          id: "customer-01",
          name: "Jane Doe",
          email: "jane@example.com",
        },
        errors: [],
      },
    });

    await signIn(
      untouchedAction,
      formWith({
        email: "  Jane@Example.com ",
        password: "correct horse battery staple",
        device: "Chrome on Windows",
        destination: "/checkout",
      }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      input: {
        email: "jane@example.com",
        password: "correct horse battery staple",
        device: "Chrome on Windows",
      },
    });
    expect(mocked.storeAccessToken).toHaveBeenCalledWith(
      "a-json-web-token",
      "2026-09-09T12:15:00Z",
    );
    expect(mocked.redirect).toHaveBeenCalledWith("/checkout");
  });

  it("hands back wrong credentials as a refusal and keeps no token", async () => {
    mocked.writeToApi.mockResolvedValue({
      login: {
        accessToken: null,
        accessTokenExpiresAt: null,
        customer: null,
        errors: [
          {
            code: "CREDENTIALS_INVALID",
            message: "No match.",
            field: null,
          },
        ],
      },
    });

    const state = await signIn(
      untouchedAction,
      formWith({ email: "jane@example.com", password: "wrong", device: "" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("CREDENTIALS_INVALID");
    expect(mocked.storeAccessToken).not.toHaveBeenCalled();
  });
});

describe("registering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs the new customer in straight away", async () => {
    mocked.writeToApi.mockResolvedValue({
      register: {
        accessToken: "a-json-web-token",
        accessTokenExpiresAt: "2026-09-09T12:15:00Z",
        customer: { id: "customer-02", name: "Sam", email: "sam@example.com" },
        errors: [],
      },
    });

    await register(
      untouchedAction,
      formWith({
        email: "Sam@Example.com",
        name: " Sam ",
        password: "a long enough password",
      }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      input: {
        email: "sam@example.com",
        name: "Sam",
        password: "a long enough password",
      },
    });
    expect(mocked.redirect).toHaveBeenCalledWith("/account");
  });

  it("hands back a taken address as a refusal", async () => {
    mocked.writeToApi.mockResolvedValue({
      register: {
        accessToken: null,
        accessTokenExpiresAt: null,
        customer: null,
        errors: [
          {
            code: "EMAIL_TAKEN",
            message: "Already known.",
            field: "input.email",
          },
        ],
      },
    });

    const state = await register(
      untouchedAction,
      formWith({
        email: "jane@example.com",
        name: "Jane",
        password: "a long enough password",
      }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("EMAIL_TAKEN");
  });
});

describe("signing out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes the session, throws the cookie away and goes to the catalogue", async () => {
    mocked.writeToApi.mockResolvedValue({
      logout: { success: true, errors: [] },
    });

    await signOut();

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {});
    expect(mocked.clearSession).toHaveBeenCalledOnce();
    expect(mocked.redirect).toHaveBeenCalledWith("/");
  });
});

describe("revoking one session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the session id", async () => {
    mocked.writeToApi.mockResolvedValue({
      revokeSession: { sessions: [], errors: [] },
    });

    const state = await revokeSession(
      untouchedAction,
      formWith({ sessionId: "session-2" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      sessionId: "session-2",
    });
    expect(state.outcome).toBe("succeeded");
  });
});
```

**`tests/actions/wishlistActions.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  writeToApi: vi.fn(),
  revalidateStorefront: vi.fn(),
}));

vi.mock("@/server/storefrontClient", () => ({
  writeToApi: mocked.writeToApi,
  readFromApi: vi.fn(),
}));

vi.mock("@/server/revalidation", () => ({
  revalidateStorefront: mocked.revalidateStorefront,
}));

import {
  removeProductFromWishlist,
  saveProductToWishlist,
} from "@/server/actions/wishlistActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("saving a product to the wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the product id", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToWishlist: { products: [{ id: "product-01" }], errors: [] },
    });

    const state = await saveProductToWishlist(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      productId: "product-01",
    });
    expect(state.outcome).toBe("succeeded");
  });

  it("hands back a refusal when nobody is signed in", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToWishlist: {
        products: [],
        errors: [
          {
            code: "NOT_AUTHENTICATED",
            message: "Sign in first.",
            field: null,
          },
        ],
      },
    });

    const state = await saveProductToWishlist(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("NOT_AUTHENTICATED");
  });
});

describe("removing a product from the wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the product id", async () => {
    mocked.writeToApi.mockResolvedValue({
      removeFromWishlist: { products: [], errors: [] },
    });

    const state = await removeProductFromWishlist(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      productId: "product-01",
    });
    expect(state.outcome).toBe("succeeded");
  });
});
```

**`tests/screens/cataloguePage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogueSelection } from "@/server/catalogueSelection";

vi.mock("@/components/CatalogueFilters", () => ({
  CatalogueFilters: ({
    categorySlug,
    searchTerm,
  }: {
    categorySlug: string | null;
    searchTerm: string | null;
  }) => (
    <form role="search">
      <p>
        filter on {categorySlug ?? "every category"} and{" "}
        {searchTerm ?? "every name"}
      </p>
    </form>
  ),
}));

vi.mock("@/components/CatalogueResults", () => ({
  CatalogueResults: ({ selection }: { selection: CatalogueSelection }) => (
    <p>
      results for {selection.categorySlug ?? "every category"} and{" "}
      {selection.searchTerm ?? "every name"}
    </p>
  ),
}));

import CataloguePage from "@/app/page";

function renderCataloguePage(
  parameters: Record<string, string | string[] | undefined>,
) {
  return CataloguePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(parameters),
  });
}

describe("the catalogue screen", () => {
  it("shows the heading, the filter and the whole catalogue by default", async () => {
    render(await renderCataloguePage({}));

    expect(
      screen.getByRole("heading", { level: 1, name: "Catalogue" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveTextContent(
      "filter on every category and every name",
    );
    expect(
      screen.getByText("results for every category and every name"),
    ).toBeInTheDocument();
  });

  it("reads the category and the search term out of the address", async () => {
    render(
      await renderCataloguePage({ category: "electronics", search: "drive" }),
    );

    expect(screen.getByRole("search")).toHaveTextContent(
      "filter on electronics and drive",
    );
    expect(
      screen.getByText("results for electronics and drive"),
    ).toBeInTheDocument();
  });
});
```

**`tests/screens/catalogueResults.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readCatalogue: vi.fn(),
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/catalogue", () => ({
  readCatalogue: mocked.readCatalogue,
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

import { CatalogueResults } from "@/components/CatalogueResults";

import { backpack, princessRing } from "../support/seedFixtures";

const wholeCatalogue = {
  categorySlug: null,
  searchTerm: null,
  inStockOnly: false,
};

function catalogueOf(products: readonly { id: string }[]) {
  return {
    products: {
      totalCount: products.length,
      pageInfo: { hasNextPage: false, endCursor: null },
      edges: products.map((product) => ({
        cursor: product.id,
        node: product,
      })),
    },
  };
}

describe("the product grid on the catalogue screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("lists every product it was given with a link to its own screen", async () => {
    mocked.readCatalogue.mockResolvedValue(
      catalogueOf([backpack, princessRing]),
    );
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await CatalogueResults({ selection: wholeCatalogue }));

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: backpack.name })).toHaveAttribute(
      "href",
      `/products/${backpack.slug}`,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: princessRing.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Out of stock" }),
    ).toBeInTheDocument();
  });

  it("says so when no product matches the filter", async () => {
    mocked.readCatalogue.mockResolvedValue(catalogueOf([]));
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(
      await CatalogueResults({
        selection: {
          categorySlug: null,
          searchTerm: "nothing",
          inStockOnly: false,
        },
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "No product matches that filter.",
    );
  });

  it("says so when the api does not answer", async () => {
    mocked.readCatalogue.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await CatalogueResults({ selection: wholeCatalogue }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "The catalogue could not be loaded",
    );
  });
});
```

**`tests/screens/productPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readProduct: vi.fn(),
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/catalogue", () => ({
  readProduct: mocked.readProduct,
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

import ProductPage from "@/app/products/[slug]/page";

import { cottonJacket } from "../support/seedFixtures";

function renderProductPage(slug: string) {
  return ProductPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  });
}

describe("the product screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("names the product, its price and the way into the cart", async () => {
    mocked.readProduct.mockResolvedValue({ product: cottonJacket });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderProductPage(cottonJacket.slug));

    expect(
      screen.getByRole("heading", { level: 1, name: "Mens Cotton Jacket" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Men's clothing" })).toHaveAttribute(
      "href",
      "/?category=mens-clothing",
    );
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(1);
    expect(
      screen.getByRole("button", { name: "Add to cart" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save to wishlist" }),
    ).toBeInTheDocument();
  });

  it("refuses the cart for a product with no stock", async () => {
    mocked.readProduct.mockResolvedValue({
      product: { ...cottonJacket, stock: 0 },
    });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderProductPage(cottonJacket.slug));

    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  });

  it("says so when the api does not answer", async () => {
    mocked.readProduct.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await renderProductPage(cottonJacket.slug));

    expect(screen.getByRole("status")).toHaveTextContent(
      "The Zappy Mart API did not answer.",
    );
  });
});
```

**`tests/screens/cartPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readCart: vi.fn(),
}));

vi.mock("@/server/cart", () => ({
  readCart: mocked.readCart,
}));

vi.mock("@/server/actions/cartActions", () => ({
  changeCartLineQuantity: vi.fn(),
  removeCartLine: vi.fn(),
}));

import CartPage from "@/app/cart/page";

import { backpack, emptyCart, filledCart } from "../support/seedFixtures";

describe("the cart screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every line as a row with its quantity, its total and its remove button", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });

    render(await CartPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Cart" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: new RegExp(backpack.name) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: `Quantity of ${backpack.name}` }),
    ).toHaveValue(1);
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Remove ${backpack.name}` }),
    ).toBeInTheDocument();
  });

  it("shows the totals and the way to the checkout", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });

    render(await CartPage());

    expect(screen.getByRole("rowheader", { name: "Total" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€109.95",
    );
    expect(screen.getByRole("link", { name: "Go to checkout" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });

  it("points an empty cart back at the catalogue", async () => {
    mocked.readCart.mockResolvedValue({ cart: emptyCart });

    render(await CartPage());

    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse the catalogue" }),
    ).toHaveAttribute("href", "/");
  });

  it("says so when the api does not answer", async () => {
    mocked.readCart.mockResolvedValue(null);

    render(await CartPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your cart could not be loaded",
    );
  });
});
```

**`tests/screens/checkoutPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readCart: vi.fn(),
  readSignedInCustomer: vi.fn(),
  holdsAccessToken: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirected to ${destination}`);
  }),
}));

vi.mock("@/server/cart", () => ({
  readCart: mocked.readCart,
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
  holdsAccessToken: mocked.holdsAccessToken,
}));

vi.mock("@/server/actions/orderingActions", () => ({
  placeOrder: vi.fn(),
}));

vi.mock("@/server/actions/cartActions", () => ({
  applyPromotionCode: vi.fn(),
  removePromotionCode: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import CheckoutPage from "@/app/checkout/page";

import { emptyCart, filledCart, signedInCustomer } from "../support/seedFixtures";

const loggedIn = {
  me: {
    id: signedInCustomer.id,
    name: signedInCustomer.name,
    email: signedInCustomer.email,
  },
  wishlist: [],
};

describe("the checkout screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.holdsAccessToken.mockResolvedValue(false);
  });

  it("greets the customer, shows the order, the promotion field and the totals", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue(loggedIn);

    render(await CheckoutPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Jane Doe, check your order and place it."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Promotion code" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Apply code" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€109.95",
    );
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
  });

  it("says what an applied code takes off", async () => {
    mocked.readCart.mockResolvedValue({
      cart: {
        ...filledCart,
        promotion: {
          code: "WELCOME10",
          kind: "PERCENTAGE",
          discount: { amount: 1100, currency: "EUR" },
        },
      },
    });
    mocked.readSignedInCustomer.mockResolvedValue(loggedIn);

    render(await CheckoutPage());

    expect(
      screen.getByText("WELCOME10 takes off €11.00."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove code" }),
    ).toBeInTheDocument();
  });

  it("cannot place an order from an empty cart", async () => {
    mocked.readCart.mockResolvedValue({ cart: emptyCart });
    mocked.readSignedInCustomer.mockResolvedValue(loggedIn);

    render(await CheckoutPage());

    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();
  });

  it("sends a visitor without an account to the log in screen", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    await expect(CheckoutPage()).rejects.toThrow(
      "redirected to /login?next=/checkout",
    );
  });

  it("says the session ended when the cookie still holds a dead token", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });
    mocked.holdsAccessToken.mockResolvedValue(true);

    await expect(CheckoutPage()).rejects.toThrow(
      "redirected to /login?next=/checkout&sessionEnded=true",
    );
  });

  it("says so when the api does not answer", async () => {
    mocked.readCart.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await CheckoutPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your checkout could not be loaded",
    );
  });
});
```

**`tests/screens/orderConfirmationPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readOrder: vi.fn(),
}));

vi.mock("@/server/ordering", () => ({
  readOrder: mocked.readOrder,
}));

import OrderConfirmationPage from "@/app/orders/[orderId]/page";

import { placedOrder } from "../support/seedFixtures";

function renderOrderPage(orderId: string) {
  return OrderConfirmationPage({
    params: Promise.resolve({ orderId }),
    searchParams: Promise.resolve({}),
  });
}

describe("the order confirmation screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("thanks the customer and shows the order number, the lines and the totals", async () => {
    mocked.readOrder.mockResolvedValue({ order: placedOrder });

    render(await renderOrderPage(placedOrder.id));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Thank you for your order",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Order ZM-1001" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Order lines" })).toHaveTextContent(
      "Fjallraven",
    );
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€98.95",
    );
    expect(
      screen.getByRole("rowheader", { name: "Promotion code" }),
    ).toBeInTheDocument();
    expect(screen.getByText("WELCOME10", { exact: true })).toBeInTheDocument();
  });

  it("offers the way back to the catalogue and to the order history", async () => {
    mocked.readOrder.mockResolvedValue({ order: placedOrder });

    render(await renderOrderPage(placedOrder.id));

    expect(
      screen.getByRole("link", { name: "Back to the catalogue" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Your order history" }),
    ).toHaveAttribute("href", "/account");
  });

  it("says so when the api does not answer", async () => {
    mocked.readOrder.mockResolvedValue(null);

    render(await renderOrderPage(placedOrder.id));

    expect(screen.getByRole("status")).toHaveTextContent(
      "This order could not be loaded",
    );
  });
});
```

**`tests/screens/accountPage.test.tsx`**

```tsx
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readAccount: vi.fn(),
  holdsAccessToken: vi.fn(),
  readOrderHistory: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirected to ${destination}`);
  }),
}));

vi.mock("@/server/account", () => ({
  readAccount: mocked.readAccount,
  holdsAccessToken: mocked.holdsAccessToken,
}));

vi.mock("@/server/ordering", () => ({
  readOrderHistory: mocked.readOrderHistory,
}));

vi.mock("@/server/actions/accountActions", () => ({
  revokeSession: vi.fn(),
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import AccountPage from "@/app/account/page";

import {
  backpack,
  placedOrder,
  signedInCustomer,
} from "../support/seedFixtures";

describe("the account screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.holdsAccessToken.mockResolvedValue(false);
  });

  it("names the customer and carries the order history and the wishlist", async () => {
    mocked.readAccount.mockResolvedValue({ me: signedInCustomer });
    mocked.readOrderHistory.mockResolvedValue({
      orders: {
        totalCount: 1,
        pageInfo: { hasNextPage: false, endCursor: null },
        edges: [{ cursor: placedOrder.id, node: placedOrder }],
      },
    });

    render(await AccountPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Your account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Order ZM-1001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: backpack.name }),
    ).toBeInTheDocument();
  });

  it("lists one open session per device and offers to revoke the other one", async () => {
    mocked.readAccount.mockResolvedValue({ me: signedInCustomer });
    mocked.readOrderHistory.mockResolvedValue(null);

    render(await AccountPage());

    const openSessions = within(
      screen.getByRole("region", { name: "Open sessions" }),
    );
    const entries = openSessions.getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent("(this device)");
    expect(
      openSessions.getByRole("button", { name: "Revoke Safari on iPhone" }),
    ).toBeInTheDocument();
  });

  it("says so when no order has been placed yet", async () => {
    mocked.readAccount.mockResolvedValue({
      me: { ...signedInCustomer, wishlist: [] },
    });
    mocked.readOrderHistory.mockResolvedValue({
      orders: {
        totalCount: 0,
        pageInfo: { hasNextPage: false, endCursor: null },
        edges: [],
      },
    });

    render(await AccountPage());

    expect(
      screen.getByText("You have not placed an order yet."),
    ).toBeInTheDocument();
    expect(screen.getByText("Your wishlist is empty.")).toBeInTheDocument();
  });

  it("asks a visitor without a session to log in", async () => {
    mocked.readAccount.mockResolvedValue({ me: null });

    render(await AccountPage());

    expect(
      screen.getByRole("link", {
        name: "Log in to see your orders and sessions",
      }),
    ).toHaveAttribute("href", "/login?next=/account");
  });

  it("sends a visitor whose session was revoked to the log in screen", async () => {
    mocked.readAccount.mockResolvedValue({ me: null });
    mocked.holdsAccessToken.mockResolvedValue(true);

    await expect(AccountPage()).rejects.toThrow(
      "redirected to /login?next=/account&sessionEnded=true",
    );
  });

  it("says so when the api does not answer", async () => {
    mocked.readAccount.mockResolvedValue(null);

    render(await AccountPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your account could not be loaded",
    );
  });
});
```

**`tests/screens/wishlistPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readWishlist: vi.fn(),
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readWishlist: mocked.readWishlist,
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

import WishlistPage from "@/app/wishlist/page";

import { backpack, signedInCustomer } from "../support/seedFixtures";

describe("the wishlist screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the saved products of a signed in customer", async () => {
    mocked.readWishlist.mockResolvedValue({ wishlist: [backpack] });
    mocked.readSignedInCustomer.mockResolvedValue({
      me: {
        id: signedInCustomer.id,
        name: signedInCustomer.name,
        email: signedInCustomer.email,
      },
      wishlist: [{ id: backpack.id }],
    });

    render(await WishlistPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Your wishlist" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: backpack.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove from wishlist" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Log in to keep it" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the list of a visitor without an account and offers to sign in", async () => {
    mocked.readWishlist.mockResolvedValue({ wishlist: [backpack] });
    mocked.readSignedInCustomer.mockResolvedValue({
      me: null,
      wishlist: [{ id: backpack.id }],
    });

    render(await WishlistPage());

    expect(
      screen.getByRole("link", { name: "Log in to keep it" }),
    ).toHaveAttribute("href", "/login?next=/wishlist");
    expect(
      screen.getByRole("heading", { level: 3, name: backpack.name }),
    ).toBeInTheDocument();
  });

  it("points an empty wishlist back at the catalogue", async () => {
    mocked.readWishlist.mockResolvedValue({ wishlist: [] });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await WishlistPage());

    expect(
      screen.getByRole("link", { name: "Browse the catalogue" }),
    ).toHaveAttribute("href", "/");
  });

  it("says so when the api does not answer", async () => {
    mocked.readWishlist.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await WishlistPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your wishlist could not be loaded",
    );
  });
});
```

**`tests/screens/logInPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/accountActions", () => ({
  signIn: vi.fn(),
}));

import LogInPage from "@/app/login/page";

import { signedInCustomer } from "../support/seedFixtures";

function renderLogInPage(
  parameters: Record<string, string | string[] | undefined>,
) {
  return LogInPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(parameters),
  });
}

describe("the log in screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the address, the password and the device", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderLogInPage({}));

    expect(
      screen.getByRole("heading", { level: 1, name: "Log in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Device description" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says the session ended when a dead session sent the visitor here", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderLogInPage({ sessionEnded: "true" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has ended. Please log in again.",
    );
  });

  it("carries the screen the visitor came from into the form", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderLogInPage({ next: "/checkout" }));

    const form = screen.getByRole("button", { name: "Log in" }).closest("form");
    expect(form?.querySelector('input[name="destination"]')).toHaveValue(
      "/checkout",
    );
  });

  it("sends a visitor who is already logged in to the account screen", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({
      me: {
        id: signedInCustomer.id,
        name: signedInCustomer.name,
        email: signedInCustomer.email,
      },
      wishlist: [],
    });

    render(await renderLogInPage({}));

    expect(
      screen.getByRole("link", { name: "Go to your account" }),
    ).toHaveAttribute("href", "/account");
  });
});
```

**`tests/screens/registerPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/accountActions", () => ({
  register: vi.fn(),
}));

import RegisterPage from "@/app/register/page";

import { signedInCustomer } from "../support/seedFixtures";

function renderRegisterPage(
  parameters: Record<string, string | string[] | undefined>,
) {
  return RegisterPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(parameters),
  });
}

describe("the register screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for a name, an address and a password", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderRegisterPage({}));

    expect(
      screen.getByRole("heading", { level: 1, name: "Register" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("points a customer who already has an account at their account", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({
      me: {
        id: signedInCustomer.id,
        name: signedInCustomer.name,
        email: signedInCustomer.email,
      },
      wishlist: [],
    });

    render(await renderRegisterPage({}));

    expect(
      screen.getByRole("link", { name: "Go to your account" }),
    ).toHaveAttribute("href", "/account");
  });
});
```

## The unit tests

```
npm test
```

Vitest with Testing Library, jsdom as the environment. A passing run prints:

```
 RUN  v5.0.0 C:/Src/zappy-mart/frontends/nextjs

 Test Files  17 passed (17)
      Tests  70 passed (70)
```

`npm run test:watch` keeps it running while you edit.

What the suite covers, and how:

- **One test file per screen**, ten of them in `tests/screens/`. Each one
  renders the screen's server component and queries it by role: a heading, a
  link, a button, a search form, a table row header. No test reaches for an
  identifier that a production component would otherwise not need, and no
  production component carries a test hook. The reads a screen makes are the
  mocked boundary, so a screen test says what the screen renders and nothing
  about how the API answers.
- **One test per server action**, four files in `tests/actions/`. Each mocks the
  client, so an action test says three things: which variables went to the API,
  what the action makes of a refusal, and whether the screens were invalidated.
  The `next/navigation` redirect is mocked as well, so the test can say where a
  placed order sends the visitor.
- **The three pieces that carry a promise** have their own tests in
  `tests/units/`: the encrypted session cookie round trips, hides the tokens in
  its value and reads a tampered value as no session, the API cookie header is
  built and read the way `docs/security.md` describes, and the route announcer
  installs one polite live region and leaves an alert on the screen as the only
  alert.

## Linting

```
npm run lint
```

Zero errors and zero warnings. `eslint-config-next` 16.3.4 bundles a version of
`eslint-plugin-react` that calls an ESLint API which ESLint 10 removed, and it
only calls it while detecting the React version, so `eslint.config.mjs` names
the React version and the detection never runs. That keeps the repository on the
ESLint 10.10.0 of `docs/versions.md`.

## The shared end to end suite

[tools/end-to-end](../../tools/end-to-end) holds the Playwright suite that drives
every Zappy Mart store front through a browser, by role and by visible text. It
is the contract this store front answers to, and it passes here.

Three terminals. The API first, on a port of its own so it never collides with
another run:

```
cd tools/mock-server
ZAPPY_MOCK_PORT=4001 node server.mjs
```

Then the store front, built and started against that API:

```
cd frontends/nextjs
ZAPPY_GRAPHQL_URL=http://localhost:4001/graphql \
  ZAPPY_STOREFRONT_ORIGIN=http://localhost:3001 \
  ZAPPY_SESSION_SECRET=a-long-random-string npm run build
ZAPPY_GRAPHQL_URL=http://localhost:4001/graphql \
  ZAPPY_STOREFRONT_ORIGIN=http://localhost:3001 \
  ZAPPY_SESSION_SECRET=a-long-random-string npm run start
```

Then the suite:

```
cd tools/end-to-end
FRONTEND_URL=http://localhost:3001 GRAPHQL_URL=http://localhost:4001/graphql \
  RESET_SEED=true npx playwright test
```

The run of 9 September 2026 against the built store front:

```
Seed reloaded at http://localhost:4001/graphql with 20 products.

Running 4 tests using 1 worker

  ok 1 [chromium] › tests\catalogueToPlacedOrder.spec.ts:13:1 › a visitor filters the catalogue, fills a cart, uses a promotion code and places an order (2.2s)
  ok 2 [chromium] › tests\sessionsAndReplay.spec.ts:24:1 › a customer registers, logs in twice, revokes the other session and cannot replay a dead one (2.8s)
  ok 3 [chromium] › tests\storeFrontIsUp.spec.ts:4:1 › the catalogue answers with products, a filter and the shop chrome (416ms)
  ok 4 [chromium] › tests\withoutJavaScript.spec.ts:6:1 › the catalogue filter and the cart forms work without JavaScript @progressive-enhancement (1.3s)

  4 passed (9.0s)
```

What those four prove about this store front, in the words of the store rather
than the framework:

1. A visitor can filter the catalogue by name and by category, open a product,
   put two of it in the cart, log in at the checkout gate, apply `WELCOME10` and
   place the order, and the totals come out at the 2268 cents that
   `contract/seed/seed.md` works through by hand.
2. A customer can register, log out, log in twice, see both sessions, revoke the
   other one, and the revoked browser is refused at once. Presenting the old
   cookie again is refused too, because the session behind the token is closed.
3. The catalogue answers with products, a filter and the shop chrome.
4. All of that, minus the account journey, works with JavaScript switched off.

## Continuous integration

`.github/workflows/nextjs.yml` at the root of the repository runs the lint, the
unit tests and the build on every push and every pull request that touches
`frontends/nextjs/**` or `contract/**`. The end to end suite is not in it,
because it needs a running API and a running store front, and
`tools/end-to-end` decides how that is wired.

```yaml
name: Next.js frontend

on:
  push:
    branches: [main]
    paths:
      - "frontends/nextjs/**"
      - "contract/**"
      - ".github/workflows/nextjs.yml"
  pull_request:
    paths:
      - "frontends/nextjs/**"
      - "contract/**"
      - ".github/workflows/nextjs.yml"

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontends/nextjs
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: frontends/nextjs/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## Versions

Every version is pinned exactly in `package.json`. The first block is what
`docs/versions.md` already decided. The second block is what this project added,
read from the npm registry on 9 September 2026.

| Package | Version | Source |
|---|---|---|
| `next` | 16.3.4 | `docs/versions.md`, verified 5 September 2026 |
| `react`, `react-dom` | 19.2.8 | `docs/versions.md`, verified 5 September 2026 |
| `@apollo/client` | 4.2.12 | `docs/versions.md`, verified 7 September 2026 |
| `graphql` | 17.0.2 | `docs/versions.md`, verified 7 September 2026 |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3 | `docs/versions.md`, verified 8 September 2026 |
| `vitest` | 5.0.0 | `docs/versions.md`, verified 8 September 2026 |
| `@testing-library/react` | 16.3.3 | `docs/versions.md`, verified 8 September 2026 |
| `eslint` | 10.10.0 | `docs/versions.md`, verified 8 September 2026 |
| `typescript` | 6.0.3 | `docs/versions.md` pins the 6.0 line and asks the project to record its patch. 6.0.3 is the newest 6.0.x on npm, and the same patch `frontends/angular` and `tools/end-to-end` run |

Read from npm on 9 September 2026, for this project:

| Package | Version | Why this one |
|---|---|---|
| `@graphql-codegen/cli` | 7.4.0 | The codegen tooling `docs/contract.md` asks for on the Next.js side. Its peer range for `graphql` includes `^17.0.0`, so it pairs with the pinned graphql 17.0.2 |
| `@graphql-codegen/client-preset` | 6.1.3 | The preset that turns `graphql()` template strings into `TypedDocumentNode` values Apollo Client accepts. Same `graphql` peer range. Fragment masking is switched off, so a fragment's fields appear inline in the type its parent query answers with |
| `eslint-config-next` | 16.3.4 | Matches the Next.js version |
| `vite` | 8.2.2 | Vitest 5.0.0 peers `vite ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0` |
| `@vitejs/plugin-react` | 6.1.1 | Peers `vite ^8.0.0` |
| `jsdom` | 30.0.1 | The Vitest environment the screen tests render in |
| `@testing-library/dom` | 10.4.1 | Peer of Testing Library for React 16.3.3 |
| `@testing-library/jest-dom` | 7.0.1 | The matchers the screen tests read with |
| `@testing-library/user-event` | 14.6.7 | Installed for the interaction tests the end to end suite does not cover |
| `rxjs` | 7.8.2 | A required peer of Apollo Client 4 |
| `server-only` | 0.0.1 | React's marker package. `server/storefrontClient.ts` imports it, so a build fails rather than shipping the token handling to the browser |
| `@types/node` | 24.13.3 | The 24 line, matching the Node 24 this runs on |
| `@types/react` | 19.2.18 | Matches React 19.2.8 |
| `@types/react-dom` | 19.2.7 | Matches React 19.2.8 |

## What is not here yet

- **No pagination on the screens.** The contract pages the catalogue and the
  order history with `first` and `after`, and this store front asks for the
  first 24 products and the first 10 orders and renders those. The seed holds
  twenty products and the account screen would need a second page only after ten
  orders. The query and its types already carry `pageInfo`, so the button is the
  only missing piece.
- **No optimistic rendering.** A cart change waits for the API answer. That is
  the honest shape for a store front whose totals are computed by the API, and
  it keeps the promise that there is no client store for server data.
- **No streaming**, for the reason under "Streaming, and why there is none".
- **The catalogue filter navigates the whole page.** That is what makes it work
  without JavaScript, and it costs a full navigation on every filter change.
