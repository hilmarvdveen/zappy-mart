# The Zappy Mart store front in React Router 8

This is Zappy Mart built as a server rendered store front on React Router
8 in framework mode. Loaders read, actions write, revalidation keeps the
screen honest after a change, and the session lives on the server. The
whole thing talks to one GraphQL contract, `../../contract/schema.graphql`,
so it runs against any Zappy Mart backend without a change.

Item Z5 in `../../BACKLOG.md`. It is the running example of blog post H18.

This README goes from an empty folder to a running store with every file
in it. Nothing is skipped and nothing is explained twice.

## The six screens

| Address | Screen | What it does |
|---|---|---|
| `/` | Catalogue | A page of products with the category filter and the search term in the address, so a filtered catalogue is a link somebody can share. |
| `/products/:slug` | Product | One product with its price, its stock and its description. Add a quantity to the cart or save it to the wishlist. |
| `/cart` | Cart | Every line with its quantity, the promotion code, and the subtotal, shipping, discount and total. The quantity form answers before the store does. |
| `/checkout` | Checkout | The lines you are about to order, the promotion code, the totals and one button. It needs a customer, so it sends a visitor to the log in screen and back. |
| `/orders/:orderId` | Order confirmation | The order that was placed, with the names and prices of that moment. |
| `/account` | Account | The order history and every open session, with a button to revoke one. |

Three more addresses carry the screens above: `/wishlist` shows what the
store saved for this visitor, `/login` and `/register` open a session, and
`/logout` closes one.

## The shape

```
browser  ──────────────►  React Router server  ──────────────►  Zappy Mart API
         one encrypted                          Authorization: Bearer <access token>
         session cookie                         Cookie: zappy_cart, zappy_refresh
         zappy_store_front                      Origin: http://localhost:5173
```

The browser holds one cookie and it holds no token. The React Router
server holds the API's access token and the API's two cookies inside that
one encrypted cookie, and it is the only party that talks to the API.
This is the backend for frontend shape of `../../docs/security.md`, and
the reason both server rendered frontends in this family have a server at
all.

One request opens one connection to the store. A root middleware opens it,
every loader and action on that request shares it, and the same middleware
writes the session cookie back on the way out. That is why the store front
never renews a token twice on one request, which matters because a refresh
token may be used once.

## From an empty folder

Node 24.20.0 or newer. Every version below is pinned, and every one of
them is in `../../docs/versions.md`.

### 1. Create the project

```
npm create react-router@8.3.1 react-router -- --no-git-init --no-install --yes
cd react-router
```

That writes the React Router template: `app/root.tsx`, `app/routes.ts`,
`app/routes/home.tsx`, a welcome screen, `react-router.config.ts`,
`vite.config.ts`, `tsconfig.json` and a `package.json`. Everything below
replaces it.

### 2. Install what the store needs

```
npm install react-router@8.3.1 @react-router/node@8.3.1 @react-router/serve@8.3.1 react@19.2.8 react-dom@19.2.8 isbot@5.2.2 @urql/core@6.0.3
```

```
npm install --save-dev @react-router/dev@8.3.1 vite@8.2.2 typescript@6.0.3 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 gql.tada@1.11.3 @0no-co/graphqlsp@1.17.5 vitest@5.0.0 @vitejs/plugin-react@6.1.1 jsdom@30.0.1 @testing-library/react@16.3.3 @testing-library/dom@10.4.1 @testing-library/jest-dom@7.0.1 @testing-library/user-event@14.6.7 eslint@10.10.0 @eslint/js@10.0.1 typescript-eslint@8.70.0 eslint-plugin-react-hooks@7.1.1 @types/react@19.2.18 @types/react-dom@19.2.7 @types/node@24.13.3
```

| Package | Version | Why it is here |
|---|---|---|
| `react-router`, `@react-router/dev`, `@react-router/node`, `@react-router/serve` | 8.3.1 | Framework mode: the route config, the loaders and actions, the middleware, the server. |
| `react`, `react-dom` | 19.2.8 | The peer React Router 8.3.1 asks for. |
| `isbot` | 5.2.2 | The template's server entry uses it to decide when to wait for the whole shell. |
| `vite` | 8.2.2 | The build and the development server behind the React Router plugin. |
| `typescript` | 6.0.3 | The 6.0 line the family pins. The Angular store front needs `<6.1.0`, so all three frontends stay on it. |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | Plain Tailwind, no design system, the same across the three frontends so the reader compares frameworks and not design. |
| `@urql/core` | 6.0.3 | The GraphQL client. The core alone, because no React component subscribes to a document. See the section on the client store. |
| `gql.tada`, `@0no-co/graphqlsp` | 1.11.3, 1.17.5 | TypeScript types derived from `../../contract/schema.graphql` with no code generation step in the build. |
| `vitest`, `@vitejs/plugin-react`, `jsdom` | 5.0.0, 6.1.1, 30.0.1 | The unit tests, one per screen and one per loader and action. |
| `@testing-library/react` and friends | 16.3.3 | Rendering a screen and finding things by role. |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks` | 10.10.0, 8.70.0, 7.1.1 | The house rules, including the list of abbreviations that are not allowed. |

### 3. Throw the template's welcome screen away

```
rm -r app/routes/home.tsx app/welcome
```

## Every file

### The manifest and the configuration

`package.json`

```json
{
  "name": "zappy-mart-react-router",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "react-router dev --port 5173",
    "build": "react-router build",
    "start": "react-router-serve ./build/server/index.js",
    "lint": "eslint .",
    "typecheck": "react-router typegen && tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate-graphql-types": "gql.tada generate-output"
  },
  "dependencies": {
    "@react-router/node": "8.3.1",
    "@react-router/serve": "8.3.1",
    "@urql/core": "6.0.3",
    "isbot": "5.2.2",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-router": "8.3.1"
  },
  "devDependencies": {
    "@0no-co/graphqlsp": "1.17.5",
    "@eslint/js": "10.0.1",
    "@react-router/dev": "8.3.1",
    "@tailwindcss/vite": "4.3.3",
    "@testing-library/dom": "10.4.1",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.7",
    "@types/node": "24.13.3",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.7",
    "@vitejs/plugin-react": "6.1.1",
    "eslint": "10.10.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "gql.tada": "1.11.3",
    "jsdom": "30.0.1",
    "tailwindcss": "4.3.3",
    "typescript": "6.0.3",
    "typescript-eslint": "8.70.0",
    "vite": "8.2.2",
    "vitest": "5.0.0"
  }
}
```

`react-router.config.ts` turns server rendering on. That is the only
setting this store needs.

```ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
} satisfies Config;
```

`vite.config.ts` mounts Tailwind and the React Router plugin and pins the
port to 5173, which is the port the end to end suite expects.

```ts
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

`tsconfig.json` carries two things worth pointing at. `rootDirs` lets a
route module import its generated types from `./+types/<name>`, and the
`@0no-co/graphqlsp` plugin tells gql.tada and the editor where the schema
lives and where to write the types it derives from it.

```json
{
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "**/.server/**/*",
    "**/.client/**/*",
    ".react-router/types/**/*"
  ],
  "exclude": ["build", "node_modules"],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2023"],
    "types": ["node", "vite/client"],
    "target": "ES2023",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "rootDirs": [".", "./.react-router/types"],
    "paths": {
      "~/*": ["./app/*"]
    },
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "plugins": [
      {
        "name": "@0no-co/graphqlsp",
        "schema": "../../contract/schema.graphql",
        "tadaOutputLocation": "./app/graphql/graphqlEnvironment.d.ts"
      }
    ]
  }
}
```

`eslint.config.js` holds the house rules. The `id-denylist` entry is the
rule against abbreviations, written out. `params` and `props` are not on
it, because React and React Router name them.

```js
import javascript from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import typescriptEslint from "typescript-eslint";

export default typescriptEslint.config(
  {
    ignores: [
      ".react-router/**",
      "build/**",
      "node_modules/**",
      "app/graphql/graphqlEnvironment.d.ts",
    ],
  },
  javascript.configs.recommended,
  typescriptEslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-undef": "off",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { disallowTypeAnnotations: false },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "id-denylist": [
        "error",
        "arr",
        "btn",
        "cfg",
        "col",
        "ctx",
        "cur",
        "curr",
        "db",
        "desc",
        "dir",
        "doc",
        "el",
        "elem",
        "env",
        "err",
        "evt",
        "ev",
        "fn",
        "idx",
        "img",
        "impl",
        "info",
        "init",
        "len",
        "lib",
        "msg",
        "num",
        "obj",
        "opt",
        "opts",
        "param",
        "prev",
        "prod",
        "prop",
        "qty",
        "req",
        "res",
        "resp",
        "ret",
        "src",
        "str",
        "temp",
        "tmp",
        "util",
        "utils",
        "val",
        "var",
        "vars",
      ],
    },
  },
);
```

`vitest.config.ts` runs two projects from one file. A test that renders
gets a browser environment, a test that calls a loader does not.

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const applicationDirectory = fileURLToPath(new URL("./app", import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "~": applicationDirectory,
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "screens",
          environment: "jsdom",
          include: ["app/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "data",
          environment: "node",
          include: ["app/**/*.test.ts"],
        },
      },
    ],
  },
});
```

`vitest.setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

`.gitignore`

```
.env
/.react-router/
/build/
/node_modules/
```

`.env.example`

```
GRAPHQL_URL=http://localhost:4000/graphql
STORE_FRONT_ORIGIN=http://localhost:5173
SESSION_SECRET=change-this-to-a-long-random-string-before-production
ACCESS_TOKEN_MAXIMUM_AGE_SECONDS=60
```

### The typed documents

gql.tada reads `../../contract/schema.graphql` and turns every document in
this project into a TypeScript type. There is no code generation step in
the build: the types come out of the template literal itself, and `tsc`
fails on a field the schema does not have.

Generate the introspection types once, and again after every schema
change:

```
npm run generate-graphql-types
```

That writes `app/graphql/graphqlEnvironment.d.ts`. It is generated, so it
is not listed here.

`app/graphql/graphql.ts` sets gql.tada up. `disableMasking` is on, so a
fragment reads as its fields rather than as a reference to unwrap, which
keeps the components plain.

```ts
import { initGraphQLTada } from "gql.tada";
import type { introspection } from "./graphqlEnvironment";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  disableMasking: true;
  scalars: {
    ID: string;
    DateTime: string;
  };
}>();

export type { ResultOf, VariablesOf } from "gql.tada";
```

`app/graphql/documents.ts` holds every query and every mutation this store
front sends, plus the fragments they share. The types at the bottom are
the ones the components take as properties, derived from the same
fragments, so a schema change lands in the components as a type error.

```ts
import { graphql, type ResultOf } from "./graphql";

export const moneyFields = graphql(`
  fragment MoneyFields on Money {
    amount
    currency
  }
`);

export const userErrorFields = graphql(`
  fragment UserErrorFields on UserError {
    code
    message
    field
  }
`);

export const productSummaryFields = graphql(
  `
    fragment ProductSummaryFields on Product {
      id
      name
      slug
      stock
      price {
        ...MoneyFields
      }
      category {
        id
        name
        slug
      }
    }
  `,
  [moneyFields],
);

export const cartFields = graphql(
  `
    fragment CartFields on Cart {
      id
      updatedAt
      lines {
        id
        quantity
        product {
          ...ProductSummaryFields
        }
        lineTotal {
          ...MoneyFields
        }
      }
      promotion {
        code
        kind
        discount {
          ...MoneyFields
        }
      }
      subtotal {
        ...MoneyFields
      }
      shipping {
        ...MoneyFields
      }
      total {
        ...MoneyFields
      }
    }
  `,
  [productSummaryFields, moneyFields],
);

export const orderFields = graphql(
  `
    fragment OrderFields on Order {
      id
      number
      status
      placedAt
      promotionCode
      lines {
        productName
        quantity
        unitPrice {
          ...MoneyFields
        }
        lineTotal {
          ...MoneyFields
        }
      }
      subtotal {
        ...MoneyFields
      }
      discount {
        ...MoneyFields
      }
      shipping {
        ...MoneyFields
      }
      total {
        ...MoneyFields
      }
    }
  `,
  [moneyFields],
);

export const sessionFields = graphql(`
  fragment SessionFields on Session {
    id
    device
    createdAt
    lastUsedAt
    current
  }
`);

export const shellQuery = graphql(`
  query Shell {
    cart {
      lines {
        quantity
      }
    }
    wishlist {
      id
    }
    me {
      id
      name
    }
  }
`);

export const catalogueQuery = graphql(
  `
    query Catalogue($filter: ProductFilter, $first: Int!, $after: String) {
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
            ...ProductSummaryFields
          }
        }
      }
    }
  `,
  [productSummaryFields],
);

export const productPageQuery = graphql(
  `
    query ProductPage($slug: String!) {
      product(slug: $slug) {
        ...ProductSummaryFields
        description
      }
    }
  `,
  [productSummaryFields],
);

export const cartQuery = graphql(
  `
    query CartPage {
      cart {
        ...CartFields
      }
    }
  `,
  [cartFields],
);

export const addToCartMutation = graphql(
  `
    mutation AddToCart($productId: ID!, $quantity: Int!) {
      addToCart(productId: $productId, quantity: $quantity) {
        cart {
          ...CartFields
        }
        availableStock
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const changeCartLineQuantityMutation = graphql(
  `
    mutation ChangeCartLineQuantity($lineId: ID!, $quantity: Int!) {
      changeCartLineQuantity(lineId: $lineId, quantity: $quantity) {
        cart {
          ...CartFields
        }
        availableStock
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const removeCartLineMutation = graphql(
  `
    mutation RemoveCartLine($lineId: ID!) {
      removeCartLine(lineId: $lineId) {
        cart {
          ...CartFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const applyPromotionCodeMutation = graphql(
  `
    mutation ApplyPromotionCode($code: String!) {
      applyPromotionCode(code: $code) {
        cart {
          ...CartFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const removePromotionCodeMutation = graphql(
  `
    mutation RemovePromotionCode {
      removePromotionCode {
        cart {
          ...CartFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [cartFields, userErrorFields],
);

export const placeOrderMutation = graphql(
  `
    mutation PlaceOrder($idempotencyKey: String!) {
      placeOrder(idempotencyKey: $idempotencyKey) {
        order {
          ...OrderFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [orderFields, userErrorFields],
);

export const orderQuery = graphql(
  `
    query OrderPage($id: ID!) {
      order(id: $id) {
        ...OrderFields
      }
    }
  `,
  [orderFields],
);

export const accountQuery = graphql(
  `
    query Account($first: Int!) {
      me {
        id
        name
        email
        createdAt
        sessions {
          ...SessionFields
        }
      }
      orders(first: $first) {
        totalCount
        edges {
          node {
            ...OrderFields
          }
        }
      }
    }
  `,
  [sessionFields, orderFields],
);

export const revokeSessionMutation = graphql(
  `
    mutation RevokeSession($sessionId: ID!) {
      revokeSession(sessionId: $sessionId) {
        sessions {
          ...SessionFields
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [sessionFields, userErrorFields],
);

export const registerMutation = graphql(
  `
    mutation Register($input: RegisterInput!) {
      register(input: $input) {
        customer {
          id
          name
        }
        accessToken
        accessTokenExpiresAt
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const loginMutation = graphql(
  `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        customer {
          id
          name
        }
        accessToken
        accessTokenExpiresAt
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const refreshSessionMutation = graphql(
  `
    mutation RefreshSession {
      refreshSession {
        customer {
          id
          name
        }
        accessToken
        accessTokenExpiresAt
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const logoutMutation = graphql(`
  mutation Logout {
    logout {
      success
    }
  }
`);

export const wishlistQuery = graphql(
  `
    query Wishlist {
      wishlist {
        ...ProductSummaryFields
      }
    }
  `,
  [productSummaryFields],
);

export const addToWishlistMutation = graphql(
  `
    mutation AddToWishlist($productId: ID!) {
      addToWishlist(productId: $productId) {
        products {
          id
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export const removeFromWishlistMutation = graphql(
  `
    mutation RemoveFromWishlist($productId: ID!) {
      removeFromWishlist(productId: $productId) {
        products {
          id
        }
        errors {
          ...UserErrorFields
        }
      }
    }
  `,
  [userErrorFields],
);

export type Money = ResultOf<typeof moneyFields>;
export type UserError = ResultOf<typeof userErrorFields>;
export type ProductSummary = ResultOf<typeof productSummaryFields>;
export type Cart = ResultOf<typeof cartFields>;
export type Order = ResultOf<typeof orderFields>;
export type Session = ResultOf<typeof sessionFields>;
```

### Talking to the store

`app/environment.server.ts` reads the settings. `GRAPHQL_URL` defaults to
the mock server. `SESSION_SECRET` has a development fallback and throws in
production, because it is the key that encrypts the session cookie.

```ts
const developmentSessionSecret = "zappy-mart-development-session-secret";
const defaultGraphqlUrl = "http://localhost:4000/graphql";
const defaultStoreFrontOrigin = "http://localhost:5173";
const defaultAccessTokenMaximumAgeSeconds = 60;

function readSetting(name: string): string | null {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

export function graphqlUrl(): string {
  return readSetting("GRAPHQL_URL") ?? defaultGraphqlUrl;
}

export function storeFrontOrigin(): string {
  return readSetting("STORE_FRONT_ORIGIN") ?? defaultStoreFrontOrigin;
}

export function runningInProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function sessionSecret(): string {
  const configured = readSetting("SESSION_SECRET");
  if (configured !== null) {
    return configured;
  }
  if (runningInProduction()) {
    throw new Error(
      "SESSION_SECRET is missing. It is the key that encrypts the store front session cookie.",
    );
  }
  return developmentSessionSecret;
}

export function accessTokenMaximumAgeSeconds(): number {
  const configured = readSetting("ACCESS_TOKEN_MAXIMUM_AGE_SECONDS");
  if (configured === null) {
    return defaultAccessTokenMaximumAgeSeconds;
  }
  const parsed = Number.parseInt(configured, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return defaultAccessTokenMaximumAgeSeconds;
  }
  return parsed;
}
```

`app/graphql/setCookies.ts` reads what the API's `Set-Cookie` headers say
and writes the `Cookie` header that goes back. A cookie with an empty
value, an age of zero or a date in the past means the API took it away,
which is how logging out clears the refresh cookie.

```ts
export type CookieChanges = Map<string, string | null>;

function attributeSaysTheCookieIsGone(attribute: string): boolean {
  const [name, value] = attribute.split("=", 2);
  const lowercaseName = name?.trim().toLowerCase() ?? "";
  if (lowercaseName === "max-age") {
    return Number.parseInt(value?.trim() ?? "", 10) <= 0;
  }
  if (lowercaseName === "expires") {
    const moment = Date.parse(value?.trim() ?? "");
    return !Number.isNaN(moment) && moment <= Date.now();
  }
  return false;
}

export function readCookieChanges(setCookieHeaders: string[]): CookieChanges {
  const changes: CookieChanges = new Map();
  for (const header of setCookieHeaders) {
    const [pair, ...attributes] = header.split(";");
    if (pair === undefined) {
      continue;
    }
    const separator = pair.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    const removed =
      value.length === 0 || attributes.some(attributeSaysTheCookieIsGone);
    changes.set(name, removed ? null : value);
  }
  return changes;
}

export function buildCookieHeader(
  cookies: Record<string, string | null>,
): string | null {
  const pairs = Object.entries(cookies)
    .filter(([, value]) => value !== null && value.length > 0)
    .map(([name, value]) => `${name}=${value}`);
  return pairs.length === 0 ? null : pairs.join("; ");
}
```

`app/graphql/client.server.ts` is the only file that speaks HTTP to the
API. It builds one urql client per call on purpose: one client for the
whole process would deduplicate two visitors asking the same question,
because urql keys an operation on the document and the variables and not
on the headers, and one visitor would get the other's cart.

It sends three things every time. The access token as a bearer token, the
API cookies the server holds for this visitor, and the `Origin` header the
API checks before it runs a mutation.

```ts
import { Client, fetchExchange, type AnyVariables } from "@urql/core";
import type { TypedDocumentNode } from "@urql/core";
import { graphqlUrl, storeFrontOrigin } from "~/environment.server";
import { buildCookieHeader } from "./setCookies";

export const cartCookieName = "zappy_cart";
export const refreshCookieName = "zappy_refresh";

export type StoreCredentials = {
  accessToken: string | null;
  cartCookie: string | null;
  refreshCookie: string | null;
};

export type StoreAnswer<Data> = {
  data: Data | null;
  failureMessage: string | null;
  setCookieHeaders: string[];
};

export const noCredentials: StoreCredentials = {
  accessToken: null,
  cartCookie: null,
  refreshCookie: null,
};

function buildHeaders(credentials: StoreCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/graphql-response+json, application/json",
    Origin: storeFrontOrigin(),
  };
  if (credentials.accessToken !== null) {
    headers.Authorization = `Bearer ${credentials.accessToken}`;
  }
  const cookieHeader = buildCookieHeader({
    [cartCookieName]: credentials.cartCookie,
    [refreshCookieName]: credentials.refreshCookie,
  });
  if (cookieHeader !== null) {
    headers.Cookie = cookieHeader;
  }
  return headers;
}

export async function callStore<Data, Variables extends AnyVariables>(
  document: TypedDocumentNode<Data, Variables>,
  variables: Variables,
  credentials: StoreCredentials,
): Promise<StoreAnswer<Data>> {
  const setCookieHeaders: string[] = [];
  const client = new Client({
    url: graphqlUrl(),
    exchanges: [fetchExchange],
    requestPolicy: "network-only",
    fetchOptions: () => ({ headers: buildHeaders(credentials) }),
    fetch: async (input, options) => {
      const response = await fetch(input, options);
      setCookieHeaders.push(...response.headers.getSetCookie());
      return response;
    },
  });

  const definition = document.definitions[0];
  const isMutation =
    definition !== undefined &&
    definition.kind === "OperationDefinition" &&
    definition.operation === "mutation";

  const result = isMutation
    ? await client.mutation(document, variables).toPromise()
    : await client.query(document, variables).toPromise();

  if (result.error !== undefined) {
    if (result.error.networkError !== undefined) {
      throw new Error(
        `The store front could not reach the Zappy Mart API at ${graphqlUrl()}.`,
        { cause: result.error.networkError },
      );
    }
    return {
      data: result.data ?? null,
      failureMessage: result.error.graphQLErrors
        .map((problem) => problem.message)
        .join(" "),
      setCookieHeaders,
    };
  }

  return {
    data: result.data ?? null,
    failureMessage: null,
    setCookieHeaders,
  };
}
```

### The session on the server

`app/session/sessionCookie.server.ts` is the one cookie the browser holds.
It is encrypted with AES-256-GCM under a key derived once from
`SESSION_SECRET`, so a stolen cookie is bytes and a changed cookie fails
to decrypt and reads as no session at all. It is httpOnly, SameSite Lax,
and Secure in production.

```ts
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { createCookie } from "react-router";
import { runningInProduction, sessionSecret } from "~/environment.server";

export type StoreFrontSession = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  accessTokenObtainedAt: string | null;
  refreshCookie: string | null;
  cartCookie: string | null;
  customerName: string | null;
};

export const emptyStoreFrontSession: StoreFrontSession = {
  accessToken: null,
  accessTokenExpiresAt: null,
  accessTokenObtainedAt: null,
  refreshCookie: null,
  cartCookie: null,
  customerName: null,
};

const cipherAlgorithm = "aes-256-gcm";
const keyLength = 32;
const nonceLength = 12;
const authenticationTagLength = 16;
const keyDerivationSalt = "zappy-mart-store-front-session";
const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

const storeFrontCookie = createCookie("zappy_store_front", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: thirtyDaysInSeconds,
  secure: runningInProduction(),
});

let derivedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (derivedKey === null) {
    derivedKey = scryptSync(sessionSecret(), keyDerivationSalt, keyLength);
  }
  return derivedKey;
}

export function encryptSession(session: StoreFrontSession): string {
  const nonce = randomBytes(nonceLength);
  const cipher = createCipheriv(cipherAlgorithm, encryptionKey(), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
}

export function decryptSession(encrypted: string): StoreFrontSession {
  try {
    const raw = Buffer.from(encrypted, "base64url");
    const nonce = raw.subarray(0, nonceLength);
    const authenticationTag = raw.subarray(
      nonceLength,
      nonceLength + authenticationTagLength,
    );
    const ciphertext = raw.subarray(nonceLength + authenticationTagLength);
    const decipher = createDecipheriv(cipherAlgorithm, encryptionKey(), nonce);
    decipher.setAuthTag(authenticationTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return { ...emptyStoreFrontSession, ...JSON.parse(plaintext) };
  } catch {
    return emptyStoreFrontSession;
  }
}

export async function readStoreFrontSession(
  request: Request,
): Promise<StoreFrontSession> {
  const encrypted: unknown = await storeFrontCookie.parse(
    request.headers.get("Cookie"),
  );
  if (typeof encrypted !== "string") {
    return emptyStoreFrontSession;
  }
  return decryptSession(encrypted);
}

export async function writeStoreFrontSession(
  session: StoreFrontSession,
): Promise<string> {
  return storeFrontCookie.serialize(encryptSession(session));
}

export async function clearStoreFrontSession(): Promise<string> {
  return storeFrontCookie.serialize("", { maxAge: 0 });
}
```

`app/session/deviceDescription.ts` turns a user agent into the line a
customer recognises in the session list, such as `Chrome on Windows`.

```ts
const browsers = [
  { marker: "Edg/", name: "Edge" },
  { marker: "OPR/", name: "Opera" },
  { marker: "Firefox/", name: "Firefox" },
  { marker: "Chrome/", name: "Chrome" },
  { marker: "Safari/", name: "Safari" },
];

const systems = [
  { marker: "Windows", name: "Windows" },
  { marker: "Android", name: "Android" },
  { marker: "iPhone", name: "iPhone" },
  { marker: "iPad", name: "iPad" },
  { marker: "Mac OS X", name: "macOS" },
  { marker: "Linux", name: "Linux" },
];

export function describeDevice(userAgent: string | null): string {
  if (userAgent === null || userAgent.trim().length === 0) {
    return "Unknown browser";
  }
  const browser = browsers.find((candidate) =>
    userAgent.includes(candidate.marker),
  );
  const system = systems.find((candidate) =>
    userAgent.includes(candidate.marker),
  );
  if (browser === undefined && system === undefined) {
    return "Unknown browser";
  }
  if (system === undefined) {
    return browser?.name ?? "Unknown browser";
  }
  if (browser === undefined) {
    return system.name;
  }
  return `${browser.name} on ${system.name}`;
}
```

`app/session/storeConnection.server.ts` is the heart of this store front.
One connection per request. It reads the session, renews the access token
when it is old enough, runs the documents, keeps whatever cookies the API
sets, and hands back the `Set-Cookie` header at the end.

Three decisions live here.

The refresh cookie travels only with the two documents that need it, the
refresh and the logout, because `../../docs/security.md` limits its path
to the refresh mutation and this server has to keep that promise itself.

The access token is renewed when it is older than
`ACCESS_TOKEN_MAXIMUM_AGE_SECONDS`, sixty by default, rather than only
when it is about to expire. A token lives fifteen minutes. Holding one for
at most a minute costs one extra call per minute of browsing and gives the
store a chance to say no much sooner.

A refusal to renew ends the session rather than retrying. A refresh token
may be used once, so a second attempt with the same value is what a leak
looks like, and the API answers a replay by revoking the whole family.

```ts
import type { AnyVariables, TypedDocumentNode } from "@urql/core";
import { data, redirect } from "react-router";
import { accessTokenMaximumAgeSeconds } from "~/environment.server";
import {
  callStore,
  cartCookieName,
  refreshCookieName,
  type StoreCredentials,
} from "~/graphql/client.server";
import { logoutMutation, refreshSessionMutation } from "~/graphql/documents";
import { readCookieChanges } from "~/graphql/setCookies";
import {
  clearStoreFrontSession,
  emptyStoreFrontSession,
  readStoreFrontSession,
  writeStoreFrontSession,
  type StoreFrontSession,
} from "./sessionCookie.server";

const renewalMarginMilliseconds = 30_000;

const documentsThatCarryTheRefreshCookie: readonly unknown[] = [
  refreshSessionMutation,
  logoutMutation,
];

export type AuthenticationOutcome = {
  customer: { id: string; name: string } | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
};

export type StoreConnection = {
  readonly signedIn: boolean;
  readonly customerName: string | null;
  readonly sessionEnded: boolean;
  run<Data, Variables extends AnyVariables>(
    document: TypedDocumentNode<Data, Variables>,
    variables: Variables,
  ): Promise<Data>;
  rememberAuthentication(outcome: AuthenticationOutcome): void;
  endSession(): void;
  headers(extra?: HeadersInit): Promise<Headers>;
};

export async function connectToStore(
  request: Request,
): Promise<StoreConnection> {
  let session = await readStoreFrontSession(request);
  let sessionChanged = false;
  let sessionCleared = false;
  let sessionEnded = false;

  function credentials(document: unknown): StoreCredentials {
    return {
      accessToken: session.accessToken,
      cartCookie: session.cartCookie,
      refreshCookie: documentsThatCarryTheRefreshCookie.includes(document)
        ? session.refreshCookie
        : null,
    };
  }

  function absorbCookies(setCookieHeaders: string[]): void {
    const changes = readCookieChanges(setCookieHeaders);
    for (const name of [cartCookieName, refreshCookieName]) {
      if (!changes.has(name)) {
        continue;
      }
      const value = changes.get(name) ?? null;
      session =
        name === cartCookieName
          ? { ...session, cartCookie: value }
          : { ...session, refreshCookie: value };
      sessionChanged = true;
    }
  }

  function accessTokenNeedsRenewal(): boolean {
    if (session.accessToken === null || session.accessTokenObtainedAt === null) {
      return true;
    }
    const obtainedAt = Date.parse(session.accessTokenObtainedAt);
    if (Number.isNaN(obtainedAt)) {
      return true;
    }
    if (Date.now() - obtainedAt >= accessTokenMaximumAgeSeconds() * 1000) {
      return true;
    }
    if (session.accessTokenExpiresAt === null) {
      return false;
    }
    const expiresAt = Date.parse(session.accessTokenExpiresAt);
    return (
      !Number.isNaN(expiresAt) &&
      expiresAt - Date.now() <= renewalMarginMilliseconds
    );
  }

  function rememberAuthentication(outcome: AuthenticationOutcome): void {
    session = {
      ...session,
      accessToken: outcome.accessToken,
      accessTokenExpiresAt: outcome.accessTokenExpiresAt,
      accessTokenObtainedAt: new Date().toISOString(),
      customerName: outcome.customer?.name ?? session.customerName,
    };
    sessionChanged = true;
  }

  function forgetCustomer(): void {
    const keptSession: StoreFrontSession = {
      ...emptyStoreFrontSession,
      cartCookie: session.cartCookie,
    };
    session = keptSession;
    sessionChanged = true;
    sessionEnded = true;
  }

  async function renewAccessToken(): Promise<void> {
    const answer = await callStore(
      refreshSessionMutation,
      {},
      credentials(refreshSessionMutation),
    );
    absorbCookies(answer.setCookieHeaders);
    const payload = answer.data?.refreshSession ?? null;
    if (payload === null || payload.accessToken === null) {
      forgetCustomer();
      return;
    }
    rememberAuthentication(payload);
  }

  async function run<Data, Variables extends AnyVariables>(
    document: TypedDocumentNode<Data, Variables>,
    variables: Variables,
  ): Promise<Data> {
    const answer = await callStore(document, variables, credentials(document));
    absorbCookies(answer.setCookieHeaders);
    if (answer.data === null) {
      throw data(
        answer.failureMessage ?? "The Zappy Mart API answered nothing.",
        { status: 502 },
      );
    }
    return answer.data;
  }

  if (session.refreshCookie !== null && accessTokenNeedsRenewal()) {
    await renewAccessToken();
  }

  return {
    get signedIn() {
      return session.accessToken !== null;
    },
    get customerName() {
      return session.customerName;
    },
    get sessionEnded() {
      return sessionEnded;
    },
    run,
    rememberAuthentication,
    endSession() {
      session = emptyStoreFrontSession;
      sessionChanged = true;
      sessionCleared = true;
    },
    async headers(extra?: HeadersInit) {
      const built = new Headers(extra);
      if (sessionCleared) {
        built.append("Set-Cookie", await clearStoreFrontSession());
      } else if (sessionChanged) {
        built.append("Set-Cookie", await writeStoreFrontSession(session));
      }
      return built;
    },
  };
}

export function requireCustomer(
  connection: StoreConnection,
  address: URL,
): void {
  if (connection.signedIn) {
    return;
  }
  const parameters = new URLSearchParams({
    returnTo: `${address.pathname}${address.search}`,
  });
  if (connection.sessionEnded) {
    parameters.set("reason", "session-ended");
  }
  throw redirect(`/login?${parameters.toString()}`);
}
```

`app/session/storeContext.ts` is how a loader reaches the connection the
middleware opened.

```ts
import { createContext } from "react-router";
import type { StoreConnection } from "./storeConnection.server";

export const storeConnectionContext = createContext<StoreConnection | null>(
  null,
);

export function storeConnectionFrom(reader: {
  get: (context: typeof storeConnectionContext) => StoreConnection | null;
}): StoreConnection {
  const connection = reader.get(storeConnectionContext);
  if (connection === null) {
    throw new Error(
      "No store connection on this request. The root middleware opens it for every route.",
    );
  }
  return connection;
}
```

### The store's own rules on this side

`app/store/money.ts`. Money arrives as an integer in cents and never
becomes a float on the way to the screen.

```ts
import type { Money } from "~/graphql/documents";

const centsInOneUnit = 100;

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: money.currency,
  }).format(money.amount / centsInOneUnit);
}

export function totalQuantity(
  lines: readonly { quantity: number }[],
): number {
  return lines.reduce((running, line) => running + line.quantity, 0);
}
```

`app/store/userErrors.ts` turns a `UserErrorCode` into a sentence a
shopper reads. The contract says a client switches on the code and shows
its own words, because the message in the payload is written for a
developer reading a log.

```ts
import type { UserError } from "~/graphql/documents";

const sentences: Record<string, string> = {
  PRODUCT_NOT_FOUND: "That product is not in the catalogue any more.",
  OUT_OF_STOCK: "There is not enough stock for that quantity.",
  QUANTITY_INVALID: "A quantity has to be one or more.",
  CART_LINE_NOT_FOUND: "That line is no longer in your cart.",
  CART_EMPTY: "Your cart is empty, so there is nothing to order.",
  CODE_UNKNOWN: "That promotion code does not exist.",
  CODE_EXPIRED: "That promotion code has expired.",
  CODE_EXHAUSTED: "That promotion code has been used up.",
  CODE_MINIMUM_NOT_MET:
    "Your subtotal is below the minimum this promotion code needs.",
  EMAIL_TAKEN: "An account with that email address already exists.",
  EMAIL_INVALID: "That email address does not look like an email address.",
  PASSWORD_TOO_SHORT: "A password needs at least twelve characters.",
  PASSWORD_TOO_LONG: "A password takes at most one hundred and twenty eight characters.",
  CREDENTIALS_INVALID: "That email address and password do not match.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SESSION_INVALID: "Your session has ended. Please log in again.",
  SESSION_NOT_FOUND: "That session is already closed.",
  NOT_AUTHENTICATED: "Please log in to continue.",
  ORDER_NOT_FOUND: "That order does not exist.",
};

export function describeUserError(userError: UserError): string {
  return sentences[userError.code] ?? userError.message;
}

export function describeUserErrors(
  userErrors: readonly UserError[],
): string[] {
  return userErrors.map(describeUserError);
}

export function carriesCode(
  userErrors: readonly UserError[],
  code: string,
): boolean {
  return userErrors.some((userError) => userError.code === code);
}
```

`app/store/catalogueSearch.ts` is the whole of the catalogue filter: the
address in, the contract's filter out, and the address of the next page.

```ts
export const categoryParameter = "category";
export const searchParameter = "search";
export const inStockParameter = "inStock";
export const afterParameter = "after";

export const cataloguePageSize = 12;
export const catalogueMaximumPageSize = 100;

export type CatalogueSearch = {
  categorySlug: string | null;
  searchTerm: string | null;
  inStockOnly: boolean;
  after: string | null;
};

export type ProductFilter = {
  categorySlug: string | null;
  nameContains: string | null;
  inStockOnly: boolean | null;
};

function readSingleValue(
  parameters: URLSearchParams,
  name: string,
): string | null {
  const value = parameters.get(name);
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function readCatalogueSearch(address: URL): CatalogueSearch {
  const parameters = address.searchParams;
  return {
    categorySlug: readSingleValue(parameters, categoryParameter),
    searchTerm: readSingleValue(parameters, searchParameter),
    inStockOnly: parameters.get(inStockParameter) === "true",
    after: readSingleValue(parameters, afterParameter),
  };
}

export function buildProductFilter(
  search: CatalogueSearch,
): ProductFilter | null {
  if (
    search.categorySlug === null &&
    search.searchTerm === null &&
    !search.inStockOnly
  ) {
    return null;
  }
  return {
    categorySlug: search.categorySlug,
    nameContains: search.searchTerm,
    inStockOnly: search.inStockOnly ? true : null,
  };
}

export function catalogueAddress(
  search: CatalogueSearch,
  changes: Partial<CatalogueSearch>,
): string {
  const next = { ...search, ...changes };
  const parameters = new URLSearchParams();
  if (next.categorySlug !== null) {
    parameters.set(categoryParameter, next.categorySlug);
  }
  if (next.searchTerm !== null) {
    parameters.set(searchParameter, next.searchTerm);
  }
  if (next.inStockOnly) {
    parameters.set(inStockParameter, "true");
  }
  if (next.after !== null) {
    parameters.set(afterParameter, next.after);
  }
  const query = parameters.toString();
  return query.length === 0 ? "/" : `/?${query}`;
}
```

`app/store/returnTo.ts` keeps the address a visitor was heading for when
the checkout asked them to log in. An address that leaves this store is
refused, because a return address is a redirect somebody else can write.

```ts
export function safeReturnTo(value: string | null, fallback: string): string {
  if (value === null) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  return trimmed;
}
```

`app/store/shell.server.ts` is what the root loader reads: the cart count,
the wishlist count and the customer's name. It also notices a dead access
token. The backends check the session on every request, so a customer who
was signed out somewhere else has `me` come back null, and the store front
ends its own session in the same breath.

```ts
import { shellQuery } from "~/graphql/documents";
import type { StoreConnection } from "~/session/storeConnection.server";
import { totalQuantity } from "./money";

export type ShellData = {
  cartQuantity: number;
  customerName: string | null;
  wishlistCount: number;
};

export async function loadShell(
  connection: StoreConnection,
): Promise<ShellData> {
  const shell = await connection.run(shellQuery, {});
  if (connection.signedIn && shell.me === null) {
    connection.endSession();
  }
  return {
    cartQuantity: totalQuantity(shell.cart.lines),
    customerName: shell.me?.name ?? null,
    wishlistCount: shell.wishlist.length,
  };
}
```

### The shell

`app/app.css`

```css
@import "tailwindcss";

@theme {
  --font-sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;
}

html {
  scroll-behavior: smooth;
}

body {
  @apply bg-slate-50 font-sans text-slate-900 antialiased;
}
```

`app/root.tsx` carries the middleware that opens the connection, the
loader that reads the shell, the document, the header, the footer and the
error boundary.

```tsx
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { connectToStore } from "~/session/storeConnection.server";
import { storeConnectionContext } from "~/session/storeContext";
import { loadShell } from "~/store/shell.server";
import "./app.css";

const openStoreConnection: Route.MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const connection = await connectToStore(request);
  context.set(storeConnectionContext, connection);
  const response = await next();
  for (const cookie of (await connection.headers()).getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
};

export const middleware: Route.MiddlewareFunction[] = [openStoreConnection];

export const meta: Route.MetaFunction = () => [
  { title: "Zappy Mart" },
  {
    name: "description",
    content:
      "Zappy Mart, one small web store built on one GraphQL contract, in React Router framework mode.",
  },
];

export async function loader({ context }: Route.LoaderArgs) {
  const connection = context.get(storeConnectionContext);
  if (connection === null) {
    throw new Error("The root middleware did not open a store connection.");
  }
  return loadShell(connection);
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function StoreFront({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <SiteHeader
        cartQuantity={loaderData.cartQuantity}
        customerName={loaderData.customerName}
        wishlistCount={loaderData.wishlistCount}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const heading = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";
  const explanation = isRouteErrorResponse(error)
    ? String(error.data)
    : "The store front could not finish this request.";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">{heading}</h1>
      <p className="mt-2 text-slate-700">{explanation}</p>
      <p className="mt-6">
        <a href="/" className="font-medium text-emerald-700 underline">
          Back to the catalogue
        </a>
      </p>
    </main>
  );
}
```

`app/routes.ts`

```ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/catalogue.tsx"),
  route("products/:slug", "routes/product.tsx"),
  route("cart", "routes/cart.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("orders/:orderId", "routes/orderConfirmation.tsx"),
  route("account", "routes/account.tsx"),
  route("wishlist", "routes/wishlist.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
```

`app/components/SiteHeader.tsx`

```tsx
import { Form, Link, NavLink } from "react-router";

type SiteHeaderProperties = {
  cartQuantity: number;
  customerName: string | null;
  wishlistCount: number;
};

const navigationLink =
  "rounded px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 aria-[current=page]:text-emerald-700";

function Badge({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }
  return (
    <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-semibold text-white">
      {count}
    </span>
  );
}

export function SiteHeader({
  cartQuantity,
  customerName,
  wishlistCount,
}: SiteHeaderProperties) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-emerald-700"
        >
          Zappy Mart
        </Link>
        <nav aria-label="Store" className="flex flex-1 items-center gap-1">
          <NavLink to="/" end className={navigationLink}>
            Catalogue
          </NavLink>
          <NavLink
            to="/wishlist"
            className={navigationLink}
            aria-label={`Wishlist, ${wishlistCount} saved`}
          >
            Wishlist
            <Badge count={wishlistCount} />
          </NavLink>
          <NavLink
            to="/cart"
            className={navigationLink}
            aria-label={`Cart, ${cartQuantity} ${cartQuantity === 1 ? "item" : "items"}`}
          >
            Cart
            <Badge count={cartQuantity} />
          </NavLink>
        </nav>
        {customerName === null ? (
          <Link
            to="/login"
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Log in
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink to="/account" className={navigationLink}>
              {customerName}
            </NavLink>
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log out
              </button>
            </Form>
          </div>
        )}
      </div>
    </header>
  );
}
```

`app/components/SiteFooter.tsx`

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-600">
        <p>
          Zappy Mart is a teaching store. Every backend serves one GraphQL
          contract and every frontend consumes it, so any frontend runs against
          any backend.
        </p>
        <p className="mt-1">
          This store front is the React Router version. Loaders read, actions
          write, and the session stays on the server.
        </p>
      </div>
    </footer>
  );
}
```

`app/components/ProductImage.tsx`. `Product.imageUrl` in the contract is a
path and the contract holds no binary. Product photography is out of scope
in `../../docs/domain.md`, so this store front draws its own placeholder
from the product's name and serves no image files at all.

```tsx
type ProductImageProperties = {
  name: string;
  className?: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word.slice(0, 1))
    .join("")
    .toUpperCase();
}

function hueOf(name: string): number {
  let running = 0;
  for (const character of name) {
    running = (running * 31 + (character.codePointAt(0) ?? 0)) % 360;
  }
  return running;
}

export function ProductImage({ name, className }: ProductImageProperties) {
  const hue = hueOf(name);
  return (
    <svg
      role="img"
      aria-label={`Placeholder drawing for ${name}`}
      viewBox="0 0 200 200"
      className={className}
    >
      <rect width="200" height="200" fill={`hsl(${hue} 60% 93%)`} />
      <text
        x="100"
        y="122"
        textAnchor="middle"
        fontSize="72"
        fontWeight="600"
        fill={`hsl(${hue} 45% 32%)`}
      >
        {initialsOf(name)}
      </text>
    </svg>
  );
}
```

`app/components/ProductCard.tsx`

```tsx
import { Link } from "react-router";
import type { ProductSummary } from "~/graphql/documents";
import { formatMoney } from "~/store/money";
import { ProductImage } from "./ProductImage";

type ProductCardProperties = {
  product: ProductSummary;
};

export function ProductCard({ product }: ProductCardProperties) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <ProductImage name={product.name} className="h-40 w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {product.category.name}
        </p>
        <h3 className="text-base font-semibold leading-snug">
          <Link
            to={`/products/${product.slug}`}
            className="text-slate-900 hover:text-emerald-700 hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-auto text-lg font-semibold text-slate-900">
          {formatMoney(product.price)}
        </p>
        <p className="text-sm text-slate-600">
          {product.stock === 0
            ? "Out of stock"
            : `${product.stock} in stock`}
        </p>
      </div>
    </article>
  );
}
```

`app/components/Messages.tsx`. A refusal is an alert and a confirmation is
a status, so a screen reader announces the first at once and the second
politely.

```tsx
type MessagesProperties = {
  tone: "problem" | "confirmation";
  messages: readonly string[];
};

const tones = {
  problem: "border-red-300 bg-red-50 text-red-900",
  confirmation: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

export function Messages({ tone, messages }: MessagesProperties) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <div
      role={tone === "problem" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <ul className="space-y-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
```

### The screens

`app/routes/catalogue.tsx`. The filter is a `<Form method="get">`, so the
category and the search term end up in the address and the browser can do
it without JavaScript. The loader reads the address, never a state hook.

Note that the loader takes `url` and not `request.url`. React Router hands
a loader a normalised URL with its own `.data` suffix removed. Building a
return address out of `request.url` gives `/checkout.data`, which is a
page that does not exist.

```tsx
import { Form, Link } from "react-router";
import type { Route } from "./+types/catalogue";
import { ProductCard } from "~/components/ProductCard";
import { catalogueQuery } from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import {
  buildProductFilter,
  catalogueAddress,
  cataloguePageSize,
  categoryParameter,
  inStockParameter,
  readCatalogueSearch,
  searchParameter,
} from "~/store/catalogueSearch";

export const meta: Route.MetaFunction = () => [
  { title: "Catalogue | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const search = readCatalogueSearch(url);
  const answer = await connection.run(catalogueQuery, {
    filter: buildProductFilter(search),
    first: cataloguePageSize,
    after: search.after,
  });
  return {
    search,
    categories: answer.categories,
    products: answer.products.edges.map((edge) => edge.node),
    totalCount: answer.products.totalCount,
    nextCursor: answer.products.pageInfo.hasNextPage
      ? answer.products.pageInfo.endCursor
      : null,
  };
}

export default function Catalogue({ loaderData }: Route.ComponentProps) {
  const { search, categories, products, totalCount, nextCursor } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Catalogue</h1>

      <Form
        method="get"
        role="search"
        className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="search-term" className="text-sm font-medium">
            Search by name
          </label>
          <input
            id="search-term"
            type="search"
            name={searchParameter}
            defaultValue={search.searchTerm ?? ""}
            className="w-56 rounded border border-slate-400 px-3 py-1.5"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name={categoryParameter}
            defaultValue={search.categorySlug ?? ""}
            className="w-56 rounded border border-slate-400 px-3 py-1.5"
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
            id="in-stock-only"
            type="checkbox"
            name={inStockParameter}
            value="true"
            defaultChecked={search.inStockOnly}
            className="size-4"
          />
          <label htmlFor="in-stock-only" className="text-sm font-medium">
            In stock only
          </label>
        </div>

        <button
          type="submit"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Filter
        </button>
      </Form>

      <p className="text-sm text-slate-600">
        {totalCount} products match this filter.
      </p>

      {products.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6">
          No product matches this filter.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      <nav aria-label="Catalogue pages" className="flex gap-4">
        {search.after === null ? null : (
          <Link
            to={catalogueAddress(search, { after: null })}
            className="font-medium text-emerald-700 underline"
          >
            First page
          </Link>
        )}
        {nextCursor === null ? null : (
          <Link
            to={catalogueAddress(search, { after: nextCursor })}
            className="font-medium text-emerald-700 underline"
          >
            Next page
          </Link>
        )}
      </nav>
    </section>
  );
}
```

`app/routes/product.tsx`

```tsx
import { data, Form, Link } from "react-router";
import type { Route } from "./+types/product";
import { Messages } from "~/components/Messages";
import { ProductImage } from "~/components/ProductImage";
import {
  addToCartMutation,
  addToWishlistMutation,
  productPageQuery,
} from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const addToCartIntent = "addToCart";
const saveToWishlistIntent = "saveToWishlist";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.product.name ?? "Product"} | Zappy Mart` },
];

export async function loader({ params, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const answer = await connection.run(productPageQuery, {
    slug: params.slug,
  });
  if (answer.product === null) {
    throw data(`No product has the slug ${params.slug}.`, { status: 404 });
  }
  return { product: answer.product };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const productId = String(formData.get("productId") ?? "");

  if (intent === saveToWishlistIntent) {
    const answer = await connection.run(addToWishlistMutation, { productId });
    const problems = describeUserErrors(answer.addToWishlist.errors);
    return {
      problems,
      confirmations: problems.length === 0 ? ["Saved to your wishlist."] : [],
      availableStock: null,
    };
  }

  if (intent !== addToCartIntent) {
    throw data(`The product page does not know the action ${intent}.`, {
      status: 400,
    });
  }

  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
  const answer = await connection.run(addToCartMutation, {
    productId,
    quantity: Number.isNaN(quantity) ? 1 : quantity,
  });
  const problems = describeUserErrors(answer.addToCart.errors);
  return {
    problems,
    confirmations: problems.length === 0 ? ["Added to your cart."] : [],
    availableStock: answer.addToCart.availableStock,
  };
}

export default function ProductPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { product } = loaderData;
  const outOfStock = product.stock === 0;

  return (
    <article className="space-y-6">
      <p className="text-sm">
        <Link to="/" className="font-medium text-emerald-700 underline">
          Back to the catalogue
        </Link>
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <ProductImage
          name={product.name}
          className="w-full rounded-lg border border-slate-200 bg-white"
        />

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {product.category.name}
          </p>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">{formatMoney(product.price)}</p>
          <p className="text-slate-700">{product.description}</p>
          <p className="text-sm text-slate-600">
            {outOfStock ? "Out of stock" : `${product.stock} in stock`}
          </p>

          <Messages tone="problem" messages={actionData?.problems ?? []} />
          <Messages
            tone="confirmation"
            messages={actionData?.confirmations ?? []}
          />
          {actionData?.availableStock === null ||
          actionData?.availableStock === undefined ? null : (
            <p className="text-sm text-slate-700">
              {actionData.availableStock} left in stock.
            </p>
          )}

          <Form method="post" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <div className="flex flex-col gap-1">
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                name="quantity"
                min={1}
                defaultValue={1}
                className="w-24 rounded border border-slate-400 px-3 py-1.5"
              />
            </div>
            <button
              type="submit"
              name="intent"
              value={addToCartIntent}
              disabled={outOfStock}
              className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add to cart
            </button>
          </Form>

          <Form method="post">
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              name="intent"
              value={saveToWishlistIntent}
              className="rounded border border-slate-400 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
            >
              Save to wishlist
            </button>
          </Form>
        </div>
      </div>
    </article>
  );
}
```

`app/routes/cart.tsx`. Every line has its own fetcher, so changing one
quantity does not put the whole page in a loading state. The line renders
what the visitor just asked for, computed from the unit price, and the
store's answer replaces it when it arrives. A line being removed
disappears at once. With JavaScript switched off the same forms post
normally and the page comes back with the new cart, which is what
`tests/withoutJavaScript.spec.ts` in the end to end suite proves.

```tsx
import { data, Form, Link, useFetcher } from "react-router";
import type { Route } from "./+types/cart";
import { Messages } from "~/components/Messages";
import {
  applyPromotionCodeMutation,
  cartQuery,
  changeCartLineQuantityMutation,
  removeCartLineMutation,
  removePromotionCodeMutation,
  type Cart,
} from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const changeQuantityIntent = "changeQuantity";
const removeLineIntent = "removeLine";
const applyPromotionCodeIntent = "applyPromotionCode";
const removePromotionCodeIntent = "removePromotionCode";

type CartLine = Cart["lines"][number];

export const meta: Route.MetaFunction = () => [{ title: "Cart | Zappy Mart" }];

export async function loader({ context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const answer = await connection.run(cartQuery, {});
  return { cart: answer.cart };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === changeQuantityIntent) {
    const quantity = Number.parseInt(
      String(formData.get("quantity") ?? "1"),
      10,
    );
    const answer = await connection.run(changeCartLineQuantityMutation, {
      lineId: String(formData.get("lineId") ?? ""),
      quantity: Number.isNaN(quantity) ? 1 : quantity,
    });
    return {
      problems: describeUserErrors(answer.changeCartLineQuantity.errors),
      availableStock: answer.changeCartLineQuantity.availableStock,
    };
  }

  if (intent === removeLineIntent) {
    const answer = await connection.run(removeCartLineMutation, {
      lineId: String(formData.get("lineId") ?? ""),
    });
    return {
      problems: describeUserErrors(answer.removeCartLine.errors),
      availableStock: null,
    };
  }

  if (intent === applyPromotionCodeIntent) {
    const answer = await connection.run(applyPromotionCodeMutation, {
      code: String(formData.get("promotionCode") ?? "").trim(),
    });
    return {
      problems: describeUserErrors(answer.applyPromotionCode.errors),
      availableStock: null,
    };
  }

  if (intent === removePromotionCodeIntent) {
    const answer = await connection.run(removePromotionCodeMutation, {});
    return {
      problems: describeUserErrors(answer.removePromotionCode.errors),
      availableStock: null,
    };
  }

  throw data(`The cart does not know the action ${intent}.`, { status: 400 });
}

function CartLineRow({ line }: { line: CartLine }) {
  const fetcher = useFetcher();
  const pendingIntent = fetcher.formData?.get("intent");
  if (pendingIntent === removeLineIntent) {
    return null;
  }

  const pendingQuantity = fetcher.formData?.get("quantity");
  const parsedQuantity =
    typeof pendingQuantity === "string"
      ? Number.parseInt(pendingQuantity, 10)
      : Number.NaN;
  const quantity = Number.isNaN(parsedQuantity)
    ? line.quantity
    : parsedQuantity;
  const lineTotal =
    quantity === line.quantity
      ? line.lineTotal
      : {
          amount: line.product.price.amount * quantity,
          currency: line.product.price.currency,
        };

  return (
    <tr className="border-b border-slate-200">
      <th scope="row" className="py-3 pr-4 text-left font-medium">
        <Link
          to={`/products/${line.product.slug}`}
          className="text-emerald-700 underline"
        >
          {line.product.name}
        </Link>
      </th>
      <td className="py-3 pr-4">{formatMoney(line.product.price)}</td>
      <td className="py-3 pr-4">
        <fetcher.Form method="post" className="flex items-center gap-2">
          <input type="hidden" name="lineId" value={line.id} />
          <label htmlFor={`quantity-${line.id}`} className="sr-only">
            Quantity of {line.product.name}
          </label>
          <input
            id={`quantity-${line.id}`}
            type="number"
            name="quantity"
            min={1}
            defaultValue={quantity}
            key={quantity}
            className="w-20 rounded border border-slate-400 px-2 py-1"
          />
          <button
            type="submit"
            name="intent"
            value={changeQuantityIntent}
            className="rounded border border-slate-400 px-3 py-1 text-sm font-medium hover:bg-slate-100"
          >
            Update
          </button>
        </fetcher.Form>
      </td>
      <td className="py-3 pr-4 font-medium">{formatMoney(lineTotal)}</td>
      <td className="py-3">
        <fetcher.Form method="post">
          <input type="hidden" name="lineId" value={line.id} />
          <button
            type="submit"
            name="intent"
            value={removeLineIntent}
            className="rounded border border-slate-400 px-3 py-1 text-sm font-medium hover:bg-slate-100"
          >
            Remove {line.product.name}
          </button>
        </fetcher.Form>
      </td>
    </tr>
  );
}

export default function CartPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { cart } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Cart</h1>

      <Messages tone="problem" messages={actionData?.problems ?? []} />
      {actionData?.availableStock === null ||
      actionData?.availableStock === undefined ? null : (
        <p className="text-sm text-slate-700">
          {actionData.availableStock} left in stock.
        </p>
      )}

      {cart.lines.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6">
          Your cart is empty.{" "}
          <Link to="/" className="font-medium text-emerald-700 underline">
            Find something in the catalogue
          </Link>
          .
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">The lines in your cart</caption>
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th scope="col" className="py-2 pr-4">
                  Product
                </th>
                <th scope="col" className="py-2 pr-4">
                  Price
                </th>
                <th scope="col" className="py-2 pr-4">
                  Quantity
                </th>
                <th scope="col" className="py-2 pr-4">
                  Line total
                </th>
                <th scope="col" className="py-2">
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

          <div className="grid gap-6 md:grid-cols-2">
            <section
              aria-labelledby="promotion-heading"
              className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 id="promotion-heading" className="text-lg font-semibold">
                Promotion code
              </h2>
              {cart.promotion === null ? null : (
                <p className="text-sm text-slate-700">
                  {cart.promotion.code} takes off{" "}
                  {formatMoney(cart.promotion.discount)}.
                </p>
              )}
              <Form method="post" className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="promotion-code"
                    className="text-sm font-medium"
                  >
                    Promotion code
                  </label>
                  <input
                    id="promotion-code"
                    type="text"
                    name="promotionCode"
                    defaultValue=""
                    className="w-48 rounded border border-slate-400 px-3 py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  name="intent"
                  value={applyPromotionCodeIntent}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Apply code
                </button>
                {cart.promotion === null ? null : (
                  <button
                    type="submit"
                    name="intent"
                    value={removePromotionCodeIntent}
                    className="rounded border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
                  >
                    Remove code
                  </button>
                )}
              </Form>
            </section>

            <section
              aria-labelledby="totals-heading"
              className="space-y-2 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 id="totals-heading" className="text-lg font-semibold">
                Totals
              </h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd>{formatMoney(cart.shipping)}</dd>
                </div>
                {cart.promotion === null ? null : (
                  <div className="flex justify-between">
                    <dt>Discount</dt>
                    <dd>{formatMoney(cart.promotion.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart.total)}</dd>
                </div>
              </dl>
              <Link
                to="/checkout"
                className="inline-block rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
              >
                Go to checkout
              </Link>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
```

`app/routes/checkout.tsx`. The idempotency key is made in the loader and
carried in the form, so a visitor who submits twice sends the same key
twice, which is what the contract asks a client to do.

```tsx
import { randomUUID } from "node:crypto";
import { data, Form, Link, redirect } from "react-router";
import type { Route } from "./+types/checkout";
import { Messages } from "~/components/Messages";
import {
  applyPromotionCodeMutation,
  cartQuery,
  placeOrderMutation,
  removePromotionCodeMutation,
} from "~/graphql/documents";
import { requireCustomer } from "~/session/storeConnection.server";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const applyPromotionCodeIntent = "applyPromotionCode";
const removePromotionCodeIntent = "removePromotionCode";
const placeOrderIntent = "placeOrder";

export const meta: Route.MetaFunction = () => [
  { title: "Checkout | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const answer = await connection.run(cartQuery, {});
  if (answer.cart.lines.length === 0) {
    throw redirect("/cart");
  }
  return {
    cart: answer.cart,
    customerName: connection.customerName,
    idempotencyKey: randomUUID(),
  };
}

export async function action({ request, url, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === applyPromotionCodeIntent) {
    const answer = await connection.run(applyPromotionCodeMutation, {
      code: String(formData.get("promotionCode") ?? "").trim(),
    });
    return { problems: describeUserErrors(answer.applyPromotionCode.errors) };
  }

  if (intent === removePromotionCodeIntent) {
    const answer = await connection.run(removePromotionCodeMutation, {});
    return { problems: describeUserErrors(answer.removePromotionCode.errors) };
  }

  if (intent !== placeOrderIntent) {
    throw data(`Checkout does not know the action ${intent}.`, { status: 400 });
  }

  const answer = await connection.run(placeOrderMutation, {
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  const order = answer.placeOrder.order;
  if (order === null) {
    return { problems: describeUserErrors(answer.placeOrder.errors) };
  }
  throw redirect(`/orders/${order.id}`);
}

export default function Checkout({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { cart, customerName, idempotencyKey } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="text-slate-700">
        {customerName === null
          ? "Check your order and place it."
          : `${customerName}, check your order and place it.`}
      </p>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">The lines you are about to order</caption>
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th scope="col" className="py-2 pr-4">
              Product
            </th>
            <th scope="col" className="py-2 pr-4">
              Quantity
            </th>
            <th scope="col" className="py-2">
              Line total
            </th>
          </tr>
        </thead>
        <tbody>
          {cart.lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-200">
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                {line.product.name}
              </th>
              <td className="py-3 pr-4">{line.quantity}</td>
              <td className="py-3">{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          aria-labelledby="checkout-promotion-heading"
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2
            id="checkout-promotion-heading"
            className="text-lg font-semibold"
          >
            Promotion code
          </h2>
          {cart.promotion === null ? null : (
            <p className="text-sm text-slate-700">
              {cart.promotion.code} takes off{" "}
              {formatMoney(cart.promotion.discount)}.
            </p>
          )}
          <Form method="post" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="checkout-promotion-code"
                className="text-sm font-medium"
              >
                Promotion code
              </label>
              <input
                id="checkout-promotion-code"
                type="text"
                name="promotionCode"
                defaultValue=""
                className="w-48 rounded border border-slate-400 px-3 py-1.5"
              />
            </div>
            <button
              type="submit"
              name="intent"
              value={applyPromotionCodeIntent}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Apply code
            </button>
            {cart.promotion === null ? null : (
              <button
                type="submit"
                name="intent"
                value={removePromotionCodeIntent}
                className="rounded border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Remove code
              </button>
            )}
          </Form>
        </section>

        <section
          aria-labelledby="checkout-totals-heading"
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 id="checkout-totals-heading" className="text-lg font-semibold">
            Totals
          </h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{formatMoney(cart.shipping)}</dd>
            </div>
            {cart.promotion === null ? null : (
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd>{formatMoney(cart.promotion.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(cart.total)}</dd>
            </div>
          </dl>
          <Form method="post">
            <input
              type="hidden"
              name="idempotencyKey"
              value={idempotencyKey}
            />
            <button
              type="submit"
              name="intent"
              value={placeOrderIntent}
              className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
            >
              Place order
            </button>
          </Form>
          <p className="text-sm">
            <Link to="/cart" className="font-medium text-emerald-700 underline">
              Back to the cart
            </Link>
          </p>
        </section>
      </div>
    </section>
  );
}
```

`app/routes/orderConfirmation.tsx`

```tsx
import { data, Link } from "react-router";
import type { Route } from "./+types/orderConfirmation";
import { orderQuery } from "~/graphql/documents";
import { requireCustomer } from "~/session/storeConnection.server";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `Order ${loaderData?.order.number ?? ""} | Zappy Mart` },
];

export async function loader({ url, params, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const answer = await connection.run(orderQuery, { id: params.orderId });
  if (answer.order === null) {
    throw data("That order does not belong to this account.", { status: 404 });
  }
  return { order: answer.order };
}

export default function OrderConfirmation({
  loaderData,
}: Route.ComponentProps) {
  const { order } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Thank you for your order</h1>
      <p className="text-slate-700">
        Order {order.number} is {order.status.toLowerCase()}. It was placed on{" "}
        {new Date(order.placedAt).toISOString().slice(0, 10)}.
      </p>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">The lines of this order</caption>
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th scope="col" className="py-2 pr-4">
              Product
            </th>
            <th scope="col" className="py-2 pr-4">
              Unit price
            </th>
            <th scope="col" className="py-2 pr-4">
              Quantity
            </th>
            <th scope="col" className="py-2">
              Line total
            </th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr
              key={`${line.productName}-${line.quantity}`}
              className="border-b border-slate-200"
            >
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                {line.productName}
              </th>
              <td className="py-3 pr-4">{formatMoney(line.unitPrice)}</td>
              <td className="py-3 pr-4">{line.quantity}</td>
              <td className="py-3">{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section
        aria-labelledby="order-totals-heading"
        className="max-w-sm space-y-2 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 id="order-totals-heading" className="text-lg font-semibold">
          Totals
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{formatMoney(order.shipping)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Discount</dt>
            <dd>{formatMoney(order.discount)}</dd>
          </div>
          {order.promotionCode === null ? null : (
            <div className="flex justify-between">
              <dt>Promotion code</dt>
              <dd>{order.promotionCode}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
        </dl>
      </section>

      <p className="flex gap-4 text-sm">
        <Link to="/account" className="font-medium text-emerald-700 underline">
          Your orders
        </Link>
        <Link to="/" className="font-medium text-emerald-700 underline">
          Back to the catalogue
        </Link>
      </p>
    </section>
  );
}
```

`app/routes/account.tsx`. Revoking a session that is not this one leaves
the page as it was. Revoking this one ends the session here too, which the
action reads from the store's answer rather than from the form.

```tsx
import { data, Form, Link, redirect } from "react-router";
import type { Route } from "./+types/account";
import { Messages } from "~/components/Messages";
import { accountQuery, revokeSessionMutation } from "~/graphql/documents";
import { requireCustomer } from "~/session/storeConnection.server";
import { storeConnectionFrom } from "~/session/storeContext";
import { formatMoney } from "~/store/money";
import { describeUserErrors } from "~/store/userErrors";

const revokeSessionIntent = "revokeSession";
const orderHistorySize = 10;

export const meta: Route.MetaFunction = () => [
  { title: "Account | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const answer = await connection.run(accountQuery, {
    first: orderHistorySize,
  });
  if (answer.me === null) {
    throw redirect("/login?reason=session-ended");
  }
  return {
    customer: answer.me,
    orders: answer.orders.edges.map((edge) => edge.node),
    orderCount: answer.orders.totalCount,
  };
}

export async function action({ request, url, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  requireCustomer(connection, url);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent !== revokeSessionIntent) {
    throw data(`The account does not know the action ${intent}.`, {
      status: 400,
    });
  }

  const answer = await connection.run(revokeSessionMutation, {
    sessionId: String(formData.get("sessionId") ?? ""),
  });
  const problems = describeUserErrors(answer.revokeSession.errors);
  if (problems.length > 0) {
    return { problems };
  }

  const stillHoldingThisDevice = answer.revokeSession.sessions.some(
    (session) => session.current,
  );
  if (!stillHoldingThisDevice) {
    connection.endSession();
    throw redirect("/login?reason=session-ended");
  }
  return { problems: [] };
}

export default function Account({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { customer, orders, orderCount } = loaderData;

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Your account</h1>
        <p className="text-slate-700">
          {customer.name}, {customer.email}
        </p>
      </section>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <section aria-labelledby="order-history-heading" className="space-y-4">
        <h2 id="order-history-heading" className="text-xl font-semibold">
          Order history
        </h2>
        {orders.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6">
            You have not placed an order yet.{" "}
            <Link to="/" className="font-medium text-emerald-700 underline">
              Find something in the catalogue
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {orderCount} orders in total.
            </p>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">The orders you placed</caption>
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th scope="col" className="py-2 pr-4">
                    Order
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Placed on
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Status
                  </th>
                  <th scope="col" className="py-2">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-200">
                    <th scope="row" className="py-3 pr-4 text-left font-medium">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-emerald-700 underline"
                      >
                        {order.number}
                      </Link>
                    </th>
                    <td className="py-3 pr-4">
                      {new Date(order.placedAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 pr-4">{order.status}</td>
                    <td className="py-3">{formatMoney(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section aria-labelledby="sessions-heading" className="space-y-4">
        <h2 id="sessions-heading" className="text-xl font-semibold">
          Open sessions
        </h2>
        <p className="text-sm text-slate-600">
          Every login opens a session. Revoke one and that browser has to log in
          again.
        </p>
        <ul className="space-y-3">
          {customer.sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">
                  {session.device}
                  {session.current ? " (this device)" : ""}
                </p>
                <p className="text-sm text-slate-600">
                  Opened {new Date(session.createdAt).toISOString().slice(0, 10)}
                  , last used{" "}
                  {new Date(session.lastUsedAt).toISOString().slice(0, 10)}
                </p>
              </div>
              <Form method="post">
                <input type="hidden" name="sessionId" value={session.id} />
                <button
                  type="submit"
                  name="intent"
                  value={revokeSessionIntent}
                  className="rounded border border-slate-400 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                >
                  Revoke {session.device}
                </button>
              </Form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

`app/routes/wishlist.tsx`. The wishlist belongs to the store on both sides
of a login. An anonymous visitor's wishlist hangs off the `zappy_cart`
cookie exactly as the cart does, and the store merges it into the
customer's on login, so this screen reads one query either way.

```tsx
import { Form, Link } from "react-router";
import type { Route } from "./+types/wishlist";
import { Messages } from "~/components/Messages";
import { ProductCard } from "~/components/ProductCard";
import {
  removeFromWishlistMutation,
  wishlistQuery,
} from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { describeUserErrors } from "~/store/userErrors";

export const meta: Route.MetaFunction = () => [
  { title: "Wishlist | Zappy Mart" },
];

export async function loader({ context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const answer = await connection.run(wishlistQuery, {});
  return { signedIn: connection.signedIn, products: answer.wishlist };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const answer = await connection.run(removeFromWishlistMutation, {
    productId: String(formData.get("productId") ?? ""),
  });
  return { problems: describeUserErrors(answer.removeFromWishlist.errors) };
}

export default function Wishlist({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { signedIn, products } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Wishlist</h1>
      <p className="text-slate-700">
        {signedIn
          ? "Your wishlist lives on your account and follows you to every browser."
          : "Your wishlist travels with this browser. It moves to your account when you log in."}
      </p>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      {products.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6">
          Nothing on your wishlist yet.{" "}
          <Link to="/" className="font-medium text-emerald-700 underline">
            Find something in the catalogue
          </Link>
          .
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id} className="space-y-2">
              <ProductCard product={product} />
              <Form method="post">
                <input type="hidden" name="productId" value={product.id} />
                <button
                  type="submit"
                  className="w-full rounded border border-slate-400 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                >
                  Remove {product.name}
                </button>
              </Form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`app/routes/login.tsx`

```tsx
import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/login";
import { Messages } from "~/components/Messages";
import { loginMutation } from "~/graphql/documents";
import { describeDevice } from "~/session/deviceDescription";
import { storeConnectionFrom } from "~/session/storeContext";
import { safeReturnTo } from "~/store/returnTo";
import { describeUserErrors } from "~/store/userErrors";

export const meta: Route.MetaFunction = () => [{ title: "Log in | Zappy Mart" }];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), "/account");
  if (connection.signedIn) {
    throw redirect(returnTo);
  }
  return {
    returnTo,
    sessionEnded: url.searchParams.get("reason") === "session-ended",
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const answer = await connection.run(loginMutation, {
    input: {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      device: describeDevice(request.headers.get("User-Agent")),
    },
  });

  const payload = answer.login;
  if (payload.accessToken === null) {
    return { problems: describeUserErrors(payload.errors) };
  }

  connection.rememberAuthentication(payload);
  throw redirect(
    safeReturnTo(String(formData.get("returnTo") ?? ""), "/account"),
  );
}

export default function Login({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Log in</h1>

      {loaderData.sessionEnded ? (
        <Messages
          tone="problem"
          messages={["Your session has ended. Please log in again."]}
        />
      ) : null}
      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <Form method="post" className="space-y-4">
        <input type="hidden" name="returnTo" value={loaderData.returnTo} />

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          Log in
        </button>
      </Form>

      <p className="text-sm">
        No account yet?{" "}
        <Link to="/register" className="font-medium text-emerald-700 underline">
          Register
        </Link>
        .
      </p>
    </section>
  );
}
```

`app/routes/register.tsx`

```tsx
import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/register";
import { Messages } from "~/components/Messages";
import { registerMutation } from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import { safeReturnTo } from "~/store/returnTo";
import { describeUserErrors } from "~/store/userErrors";

export const meta: Route.MetaFunction = () => [
  { title: "Register | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), "/account");
  if (connection.signedIn) {
    throw redirect(returnTo);
  }
  return { returnTo };
}

export async function action({ request, context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  const formData = await request.formData();
  const answer = await connection.run(registerMutation, {
    input: {
      email: String(formData.get("email") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    },
  });

  const payload = answer.register;
  if (payload.accessToken === null) {
    return { problems: describeUserErrors(payload.errors) };
  }

  connection.rememberAuthentication(payload);
  throw redirect(
    safeReturnTo(String(formData.get("returnTo") ?? ""), "/account"),
  );
}

export default function Register({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Register</h1>

      <Messages tone="problem" messages={actionData?.problems ?? []} />

      <Form method="post" className="space-y-4">
        <input type="hidden" name="returnTo" value={loaderData.returnTo} />

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            autoComplete="name"
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            required
            className="rounded border border-slate-400 px-3 py-2"
          />
          <p className="text-sm text-slate-600">
            At least twelve characters, at most one hundred and twenty eight.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          Register
        </button>
      </Form>

      <p className="text-sm">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-emerald-700 underline">
          Log in
        </Link>
        .
      </p>
    </section>
  );
}
```

`app/routes/logout.tsx` has no screen. It is an address a form posts to.

```tsx
import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { logoutMutation } from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";

export async function loader() {
  return redirect("/");
}

export async function action({ context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  if (connection.signedIn) {
    await connection.run(logoutMutation, {});
  }
  connection.endSession();
  return redirect("/");
}
```

## Running it

Start a Zappy Mart API first. The mock server serves the whole contract
from the shared seed:

```
cd ../../tools/mock-server
npm install
node server.mjs
```

It prints `Zappy Mart mock server is serving http://localhost:4000/graphql`.

Then the store front:

```
cd frontends/react-router
npm install
npm run generate-graphql-types
npm run dev
```

It prints:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173/` and the catalogue is there with twenty
products.

For something closer to production:

```
npm run build
PORT=5173 SESSION_SECRET=a-long-random-string npm run start
```

`SESSION_SECRET` is not optional there. It is the key that encrypts the
session cookie, and the store front refuses to start a session without it.

| Variable | Default | What it does |
|---|---|---|
| `GRAPHQL_URL` | `http://localhost:4000/graphql` | The Zappy Mart API this store front calls. |
| `STORE_FRONT_ORIGIN` | `http://localhost:5173` | The `Origin` header sent with every call. The API checks it before it runs a mutation. |
| `SESSION_SECRET` | a development string | The key the session cookie is encrypted with. Required in production. |
| `ACCESS_TOKEN_MAXIMUM_AGE_SECONDS` | `60` | How long the server holds an access token before it renews it. Set it to `0` to renew on every request. |
| `PORT` | `3000` for `npm run start`, `5173` for `npm run dev` | The port the store front listens on. |

## The tests

```
npm run lint
npm run typecheck
npm test
npm run build
```

There is one screen test per screen, and it finds everything by role. There
is one test per loader and per action, and it stands a mocked GraphQL
client in for the real one, so a loader is tested against the answers the
contract allows rather than against a running server.

A passing run prints:

```
 Test Files  26 passed (26)
      Tests  114 passed (114)
```

The screen tests render a route component through `createRoutesStub`,
which gives it the router context that `Link`, `Form` and `useFetcher`
need. The data tests replace `callStore` with `vi.mock` and call the
loader or the action directly.

`app/testing/storeTestSupport.ts` is the small piece of shared test
plumbing: it opens a connection, builds the arguments React Router hands a
loader, and reads the status out of a refusal.

```ts
import { RouterContextProvider } from "react-router";
import type { StoreAnswer } from "~/graphql/client.server";
import {
  emptyStoreFrontSession,
  writeStoreFrontSession,
  type StoreFrontSession,
} from "~/session/sessionCookie.server";
import {
  connectToStore,
  type StoreConnection,
} from "~/session/storeConnection.server";
import { storeConnectionContext } from "~/session/storeContext";

export const storeFrontAddress = "http://localhost:5173";

export async function requestWithSession(
  session: Partial<StoreFrontSession>,
  path = "/",
): Promise<Request> {
  const setCookie = await writeStoreFrontSession({
    ...emptyStoreFrontSession,
    ...session,
  });
  return new Request(`${storeFrontAddress}${path}`, {
    headers: { Cookie: setCookie.split(";")[0] ?? "" },
  });
}

export function answerWith<Data>(data: Data): StoreAnswer<Data> {
  return { data, failureMessage: null, setCookieHeaders: [] };
}

export function refusalStatus(refusal: unknown): number | undefined {
  if (refusal instanceof Response) {
    return refusal.status;
  }
  const responseOptions = (refusal as Record<string, unknown>)["init"];
  if (typeof responseOptions !== "object" || responseOptions === null) {
    return undefined;
  }
  const status = (responseOptions as Record<string, unknown>)["status"];
  return typeof status === "number" ? status : undefined;
}

export async function statusOfRefusal(
  attempt: Promise<unknown>,
): Promise<number | undefined> {
  return attempt.then(
    () => undefined,
    (refusal: unknown) => refusalStatus(refusal),
  );
}

export async function openConnectionForTest(options?: {
  signedIn?: boolean;
}): Promise<StoreConnection> {
  const connection = await connectToStore(new Request(`${storeFrontAddress}/`));
  if (options?.signedIn === true) {
    connection.rememberAuthentication({
      customer: { id: "customer-01", name: "Jane Doe" },
      accessToken: "test-access-token",
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  }
  return connection;
}

export function contextFor(connection: StoreConnection): RouterContextProvider {
  const context = new RouterContextProvider();
  context.set(storeConnectionContext, connection);
  return context;
}

export function routeArgumentsFor<Params extends Record<string, string>>(
  connection: StoreConnection,
  request: Request,
  params: Params = {} as Params,
  pattern = "/",
) {
  return {
    request,
    url: new URL(request.url),
    params,
    pattern,
    context: contextFor(connection),
  };
}

export function formRequest(
  path: string,
  fields: Record<string, string | string[]>,
): Request {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        formData.append(name, entry);
      }
    } else {
      formData.append(name, value);
    }
  }
  return new Request(`${storeFrontAddress}${path}`, {
    method: "POST",
    body: formData,
  });
}
```

`app/testing/fixtures.ts` holds the sample data, taken from the shared
seed so the numbers in the tests are the numbers a real run produces.

```ts
import type {
  Cart,
  Money,
  Order,
  ProductSummary,
  Session,
} from "~/graphql/documents";

export function euro(amount: number): Money {
  return { amount, currency: "EUR" };
}

export const mensClothing = {
  id: "category-mens-clothing",
  name: "Men's clothing",
  slug: "mens-clothing",
};

export const electronics = {
  id: "category-electronics",
  name: "Electronics",
  slug: "electronics",
};

export const cottonJacket: ProductSummary = {
  id: "product-03",
  name: "Mens Cotton Jacket",
  slug: "mens-cotton-jacket",
  stock: 8,
  price: euro(5599),
  category: mensClothing,
};

export const gamingDrive: ProductSummary = {
  id: "product-12",
  name: "WD 4TB Gaming Drive",
  slug: "wd-4tb-gaming-drive-playstation-4",
  stock: 1,
  price: euro(11400),
  category: electronics,
};

export const cartWithOneJacket: Cart = {
  id: "cart-01",
  updatedAt: "2026-09-09T10:00:00Z",
  lines: [
    {
      id: "line-01",
      quantity: 1,
      product: cottonJacket,
      lineTotal: euro(5599),
    },
  ],
  promotion: null,
  subtotal: euro(5599),
  shipping: euro(0),
  total: euro(5599),
};

export const emptyCart: Cart = {
  id: "cart-02",
  updatedAt: "2026-09-09T10:00:00Z",
  lines: [],
  promotion: null,
  subtotal: euro(0),
  shipping: euro(0),
  total: euro(0),
};

export const cartWithPromotion: Cart = {
  ...cartWithOneJacket,
  promotion: {
    code: "WELCOME10",
    kind: "PERCENTAGE",
    discount: euro(560),
  },
  total: euro(5039),
};

export const placedOrder: Order = {
  id: "order-01",
  number: "ZM-1001",
  status: "PAID",
  placedAt: "2026-09-09T10:05:00Z",
  promotionCode: "WELCOME10",
  lines: [
    {
      productName: "Mens Cotton Jacket",
      quantity: 1,
      unitPrice: euro(5599),
      lineTotal: euro(5599),
    },
  ],
  subtotal: euro(5599),
  discount: euro(560),
  shipping: euro(0),
  total: euro(5039),
};

export const thisDeviceSession: Session = {
  id: "session-01",
  device: "Chrome on Windows",
  createdAt: "2026-09-09T09:00:00Z",
  lastUsedAt: "2026-09-09T10:00:00Z",
  current: true,
};

export const otherDeviceSession: Session = {
  id: "session-02",
  device: "Firefox on Linux",
  createdAt: "2026-09-08T09:00:00Z",
  lastUsedAt: "2026-09-08T10:00:00Z",
  current: false,
};
```

### The screen tests

`app/routes/catalogue.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Catalogue from "./catalogue";
import { cottonJacket, gamingDrive, mensClothing } from "~/testing/fixtures";

function renderCatalogue() {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Catalogue,
      loader: () => ({
        search: {
          categorySlug: "mens-clothing",
          searchTerm: "jacket",
          inStockOnly: false,
          after: null,
        },
        categories: [mensClothing],
        products: [cottonJacket, gamingDrive],
        totalCount: 2,
        nextCursor: "cursor-12",
      }),
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
}

test("the catalogue names every product it loaded", async () => {
  renderCatalogue();

  expect(
    await screen.findByRole("heading", { level: 1, name: "Catalogue" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: cottonJacket.name }),
  ).toHaveAttribute("href", `/products/${cottonJacket.slug}`);
  expect(screen.getByRole("link", { name: gamingDrive.name })).toBeVisible();
});

test("the catalogue keeps the search term and the category in the form", async () => {
  renderCatalogue();

  expect(await screen.findByRole("searchbox", { name: "Search by name" })).toHaveValue(
    "jacket",
  );
  expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue(
    "mens-clothing",
  );
  expect(
    screen.getByRole("checkbox", { name: "In stock only" }),
  ).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Filter" })).toBeVisible();
});

test("the catalogue offers the next page when the API says there is one", async () => {
  renderCatalogue();

  expect(await screen.findByRole("link", { name: "Next page" })).toHaveAttribute(
    "href",
    "/?category=mens-clothing&search=jacket&after=cursor-12",
  );
});
```

`app/routes/product.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import ProductPage from "./product";
import { cottonJacket, gamingDrive } from "~/testing/fixtures";

const description = "Great outerwear jackets for spring, autumn and winter.";

function renderProduct(options?: {
  outOfStock?: boolean;
  problems?: string[];
}) {
  const product = options?.outOfStock === true ? gamingDrive : cottonJacket;
  const Stub = createRoutesStub([
    {
      path: "/products/:slug",
      Component: ProductPage,
      loader: () => ({
        product: {
          ...product,
          stock: options?.outOfStock === true ? 0 : product.stock,
          description,
        },
        signedIn: false,
      }),
      action: () => ({
        problems: options?.problems ?? [],
        confirmations:
          options?.problems === undefined ? ["Added to your cart."] : [],
        availableStock: options?.problems === undefined ? null : 1,
      }),
    },
  ]);
  render(<Stub initialEntries={[`/products/${product.slug}`]} />);
}

test("the product page shows the name, the price and the stock", async () => {
  renderProduct();

  expect(
    await screen.findByRole("heading", { level: 1, name: cottonJacket.name }),
  ).toBeVisible();
  expect(screen.getByText("€55.99")).toBeVisible();
  expect(screen.getByText("8 in stock")).toBeVisible();
  expect(screen.getByText(description)).toBeVisible();
});

test("the product page confirms an addition to the cart", async () => {
  renderProduct();

  await userEvent.click(
    await screen.findByRole("button", { name: "Add to cart" }),
  );

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Added to your cart.",
  );
});

test("the product page refuses to add a product with no stock", async () => {
  renderProduct({ outOfStock: true });

  expect(await screen.findByText("Out of stock")).toBeVisible();
  expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
});

test("the product page reports what the store refused", async () => {
  renderProduct({ problems: ["There is not enough stock for that quantity."] });

  await userEvent.click(
    await screen.findByRole("button", { name: "Add to cart" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "There is not enough stock for that quantity.",
  );
  expect(screen.getByText("1 left in stock.")).toBeVisible();
});
```

`app/routes/cart.test.tsx`

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import CartPage from "./cart";
import type { Cart } from "~/graphql/documents";
import {
  cartWithOneJacket,
  cartWithPromotion,
  emptyCart,
} from "~/testing/fixtures";

function renderCart(cart: Cart, action?: () => Promise<unknown>) {
  const Stub = createRoutesStub([
    {
      path: "/cart",
      Component: CartPage,
      loader: () => ({ cart }),
      action: action ?? (() => ({ problems: [], availableStock: null })),
    },
  ]);
  render(<Stub initialEntries={["/cart"]} />);
}

test("an empty cart points back at the catalogue", async () => {
  renderCart(emptyCart);

  expect(
    await screen.findByRole("heading", { level: 1, name: "Cart" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Find something in the catalogue" }),
  ).toHaveAttribute("href", "/");
});

test("a filled cart lists every line with its totals", async () => {
  renderCart(cartWithOneJacket);

  const row = await screen.findByRole("row", {
    name: /Mens Cotton Jacket/,
  });
  expect(within(row).getByRole("spinbutton")).toHaveValue(1);
  expect(within(row).getAllByText("€55.99")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Go to checkout" })).toHaveAttribute(
    "href",
    "/checkout",
  );
});

test("a promotion code on the cart shows what it takes off", async () => {
  renderCart(cartWithPromotion);

  expect(
    await screen.findByText("WELCOME10 takes off €5.60."),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Remove code" }),
  ).toBeVisible();
});

test("a quantity change shows the new line total before the store answers", async () => {
  let releaseAction = () => undefined as void;
  const pending = new Promise<void>((resolve) => {
    releaseAction = () => resolve();
  });
  renderCart(cartWithOneJacket, async () => {
    await pending;
    return { problems: [], availableStock: null };
  });

  const row = await screen.findByRole("row", { name: /Mens Cotton Jacket/ });
  const quantity = within(row).getByRole("spinbutton");
  await userEvent.clear(quantity);
  await userEvent.type(quantity, "3");
  await userEvent.click(within(row).getByRole("button", { name: "Update" }));

  expect(await within(row).findByText("€167.97")).toBeVisible();
  releaseAction();
});
```

`app/routes/checkout.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Checkout from "./checkout";
import { cartWithPromotion } from "~/testing/fixtures";

function renderCheckout(problems: string[] = []) {
  const Stub = createRoutesStub([
    {
      path: "/checkout",
      Component: Checkout,
      loader: () => ({
        cart: cartWithPromotion,
        customerName: "Jane Doe",
        idempotencyKey: "checkout-key-01",
      }),
      action: () => ({ problems }),
    },
  ]);
  render(<Stub initialEntries={["/checkout"]} />);
}

test("checkout greets the customer and lists what is about to be ordered", async () => {
  renderCheckout();

  expect(
    await screen.findByRole("heading", { level: 1, name: "Checkout" }),
  ).toBeVisible();
  expect(
    screen.getByText("Jane Doe, check your order and place it."),
  ).toBeVisible();
  expect(
    screen.getByRole("row", { name: /Mens Cotton Jacket/ }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Place order" })).toBeVisible();
});

test("checkout shows the promotion code and the totals it produced", async () => {
  renderCheckout();

  expect(await screen.findByText("WELCOME10 takes off €5.60.")).toBeVisible();
  expect(screen.getByText("€50.39")).toBeVisible();
});

test("checkout reports why an order was refused", async () => {
  renderCheckout(["Your cart is empty, so there is nothing to order."]);

  await userEvent.click(
    await screen.findByRole("button", { name: "Place order" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your cart is empty, so there is nothing to order.",
  );
});
```

`app/routes/orderConfirmation.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import OrderConfirmation from "./orderConfirmation";
import { placedOrder } from "~/testing/fixtures";

function renderConfirmation() {
  const Stub = createRoutesStub([
    {
      path: "/orders/:orderId",
      Component: OrderConfirmation,
      loader: () => ({ order: placedOrder }),
    },
  ]);
  render(<Stub initialEntries={[`/orders/${placedOrder.id}`]} />);
}

test("the confirmation thanks the customer and names the order", async () => {
  renderConfirmation();

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Thank you for your order",
    }),
  ).toBeVisible();
  expect(
    screen.getByText("Order ZM-1001 is paid. It was placed on 2026-09-09."),
  ).toBeVisible();
});

test("the confirmation lists the lines and the totals of that moment", async () => {
  renderConfirmation();

  const row = await screen.findByRole("row", { name: /Mens Cotton Jacket/ });
  expect(row).toBeVisible();
  expect(screen.getByText("WELCOME10")).toBeVisible();
  expect(screen.getByText("€5.60")).toBeVisible();
  expect(screen.getByText("€50.39")).toBeVisible();
});

test("the confirmation offers the way back to the account and the catalogue", async () => {
  renderConfirmation();

  expect(await screen.findByRole("link", { name: "Your orders" })).toHaveAttribute(
    "href",
    "/account",
  );
  expect(
    screen.getByRole("link", { name: "Back to the catalogue" }),
  ).toHaveAttribute("href", "/");
});
```

`app/routes/account.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Account from "./account";
import {
  otherDeviceSession,
  placedOrder,
  thisDeviceSession,
} from "~/testing/fixtures";

function renderAccount(options?: { withoutOrders?: boolean }) {
  const Stub = createRoutesStub([
    {
      path: "/account",
      Component: Account,
      loader: () => ({
        customer: {
          id: "customer-01",
          name: "Jane Doe",
          email: "jane@example.com",
          createdAt: "2026-01-15T09:00:00Z",
          sessions: [thisDeviceSession, otherDeviceSession],
        },
        orders: options?.withoutOrders === true ? [] : [placedOrder],
        orderCount: options?.withoutOrders === true ? 0 : 1,
      }),
      action: () => ({ problems: [] }),
    },
  ]);
  render(<Stub initialEntries={["/account"]} />);
}

test("the account names the customer", async () => {
  renderAccount();

  expect(
    await screen.findByRole("heading", { level: 1, name: "Your account" }),
  ).toBeVisible();
  expect(screen.getByText("Jane Doe, jane@example.com")).toBeVisible();
});

test("the account lists the order history with a link per order", async () => {
  renderAccount();

  expect(
    await screen.findByRole("heading", { level: 2, name: "Order history" }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "ZM-1001" })).toHaveAttribute(
    "href",
    "/orders/order-01",
  );
  expect(screen.getByText("€50.39")).toBeVisible();
});

test("the account says so when no order has been placed", async () => {
  renderAccount({ withoutOrders: true });

  expect(
    await screen.findByText(/You have not placed an order yet/),
  ).toBeVisible();
});

test("the account lists every open session with a way to revoke it", async () => {
  renderAccount();

  expect(
    await screen.findByRole("heading", { level: 2, name: "Open sessions" }),
  ).toBeVisible();
  expect(screen.getByText("Chrome on Windows (this device)")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Revoke Firefox on Linux" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Revoke Chrome on Windows" }),
  ).toBeVisible();
});
```

`app/routes/wishlist.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Wishlist from "./wishlist";
import { cottonJacket } from "~/testing/fixtures";

function renderWishlist(options: {
  signedIn: boolean;
  products: typeof cottonJacket[];
}) {
  const Stub = createRoutesStub([
    {
      path: "/wishlist",
      Component: Wishlist,
      loader: () => options,
      action: () => ({ problems: [] }),
    },
  ]);
  render(<Stub initialEntries={["/wishlist"]} />);
}

test("an empty wishlist points back at the catalogue", async () => {
  renderWishlist({ signedIn: false, products: [] });

  expect(
    await screen.findByRole("heading", { level: 1, name: "Wishlist" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Find something in the catalogue" }),
  ).toHaveAttribute("href", "/");
});

test("an anonymous wishlist says the list lives in this browser", async () => {
  renderWishlist({ signedIn: false, products: [cottonJacket] });

  expect(
    await screen.findByText(
      "Your wishlist travels with this browser. It moves to your account when you log in.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Remove Mens Cotton Jacket" }),
  ).toBeVisible();
});

test("a signed in wishlist says the list lives on the account", async () => {
  renderWishlist({ signedIn: true, products: [cottonJacket] });

  expect(
    await screen.findByText(
      "Your wishlist lives on your account and follows you to every browser.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: cottonJacket.name }),
  ).toHaveAttribute("href", `/products/${cottonJacket.slug}`);
});
```

`app/components/SiteHeader.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import { SiteHeader } from "./SiteHeader";

function renderHeader(properties: {
  cartQuantity: number;
  customerName: string | null;
  wishlistCount: number;
}) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <SiteHeader {...properties} />,
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
}

test("the header counts the cart and offers a way in", async () => {
  renderHeader({ cartQuantity: 3, customerName: null, wishlistCount: 0 });

  expect(
    await screen.findByRole("link", { name: "Cart, 3 items" }),
  ).toHaveAttribute("href", "/cart");
  expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

test("the header counts the wishlist the store keeps for this visitor", async () => {
  renderHeader({ cartQuantity: 0, customerName: null, wishlistCount: 2 });

  expect(
    await screen.findByRole("link", { name: "Wishlist, 2 saved" }),
  ).toHaveAttribute("href", "/wishlist");
});

test("the header names the customer and offers a way out once signed in", async () => {
  renderHeader({
    cartQuantity: 1,
    customerName: "Jane Doe",
    wishlistCount: 4,
  });

  expect(await screen.findByRole("link", { name: "Jane Doe" })).toHaveAttribute(
    "href",
    "/account",
  );
  expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
});
```

### The loader and action tests

`app/routes/catalogue.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { loader } from "./catalogue";
import { cottonJacket, mensClothing } from "~/testing/fixtures";
import {
  answerWith,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

const catalogueAnswer = {
  categories: [mensClothing],
  products: {
    totalCount: 1,
    pageInfo: { hasNextPage: true, endCursor: "cursor-12" },
    edges: [{ cursor: "cursor-03", node: cottonJacket }],
  },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
  vi.mocked(callStore).mockResolvedValue(answerWith(catalogueAnswer));
});

async function loadCatalogue(query: string) {
  const connection = await openConnectionForTest();
  return loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/${query}`)),
  );
}

test("the loader asks for the whole catalogue when the URL carries no filter", async () => {
  await loadCatalogue("");

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    filter: null,
    first: 12,
    after: null,
  });
});

test("the loader turns the category, the search term and the stock switch into a filter", async () => {
  await loadCatalogue("?category=mens-clothing&search=jacket&inStock=true");

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    filter: {
      categorySlug: "mens-clothing",
      nameContains: "jacket",
      inStockOnly: true,
    },
    first: 12,
    after: null,
  });
});

test("the loader passes the cursor of the previous page on", async () => {
  await loadCatalogue("?after=cursor-03");

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toMatchObject({
    after: "cursor-03",
  });
});

test("the loader hands the screen the products, the count and the next cursor", async () => {
  const loaded = await loadCatalogue("");

  expect(loaded.products).toEqual([cottonJacket]);
  expect(loaded.categories).toEqual([mensClothing]);
  expect(loaded.totalCount).toBe(1);
  expect(loaded.nextCursor).toBe("cursor-12");
});

test("the loader answers no next cursor when the page is the last one", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      ...catalogueAnswer,
      products: {
        ...catalogueAnswer.products,
        pageInfo: { hasNextPage: false, endCursor: "cursor-12" },
      },
    }),
  );

  const loaded = await loadCatalogue("");

  expect(loaded.nextCursor).toBeNull();
});
```

`app/routes/product.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./product";
import { cottonJacket } from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
  statusOfRefusal,
} from "~/testing/storeTestSupport";

const productAnswer = {
  product: { ...cottonJacket, description: "A jacket for every season." },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader reads one product by the slug in the address", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(productAnswer));
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(`${storeFrontAddress}/products/mens-cotton-jacket`),
      { slug: "mens-cotton-jacket" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    slug: "mens-cotton-jacket",
  });
  expect(loaded.product.name).toBe("Mens Cotton Jacket");
});

test("the loader answers not found when no product has the slug", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ product: null }));
  const connection = await openConnectionForTest();

  expect(
    await statusOfRefusal(
      loader(
        routeArgumentsFor(
          connection,
          new Request(`${storeFrontAddress}/products/nothing`),
          { slug: "nothing" },
        ),
      ),
    ),
  ).toBe(404);
});

test("the action adds the wanted quantity to the cart and confirms it", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      addToCart: { cart: null, availableStock: null, errors: [] },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/products/mens-cotton-jacket", {
        intent: "addToCart",
        productId: "product-03",
        quantity: "2",
      }),
      { slug: "mens-cotton-jacket" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    productId: "product-03",
    quantity: 2,
  });
  expect(outcome.confirmations).toEqual(["Added to your cart."]);
});

test("the action turns a refusal into a sentence and names the stock that is left", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      addToCart: {
        cart: null,
        availableStock: 1,
        errors: [
          {
            code: "OUT_OF_STOCK",
            message: "Only one left.",
            field: "quantity",
          },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/products/wd-4tb-gaming-drive-playstation-4", {
        intent: "addToCart",
        productId: "product-12",
        quantity: "2",
      }),
      { slug: "wd-4tb-gaming-drive-playstation-4" },
    ),
  );

  expect(outcome.problems).toEqual([
    "There is not enough stock for that quantity.",
  ]);
  expect(outcome.availableStock).toBe(1);
});

test("the action saves a product on the wishlist the store keeps", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ addToWishlist: { products: [], errors: [] } }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/products/mens-cotton-jacket", {
        intent: "saveToWishlist",
        productId: "product-03",
      }),
      { slug: "mens-cotton-jacket" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    productId: "product-03",
  });
  expect(outcome.confirmations).toEqual(["Saved to your wishlist."]);
});

test("the action refuses an intent the product page does not know", async () => {
  const connection = await openConnectionForTest();

  expect(
    await statusOfRefusal(
      action(
        routeArgumentsFor(
          connection,
          formRequest("/products/mens-cotton-jacket", { intent: "shout" }),
          { slug: "mens-cotton-jacket" },
        ),
      ),
    ),
  ).toBe(400);
});
```

`app/routes/cart.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./cart";
import { cartWithOneJacket, cartWithPromotion } from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
  statusOfRefusal,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

async function runCartAction(fields: Record<string, string>) {
  const connection = await openConnectionForTest();
  return action(
    routeArgumentsFor(connection, formRequest("/cart", fields)),
  );
}

test("the loader hands the screen the cart the store keeps", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ cart: cartWithOneJacket }),
  );
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/cart`)),
  );

  expect(loaded.cart.lines).toHaveLength(1);
});

test("the action changes the quantity of one line", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      changeCartLineQuantity: {
        cart: cartWithOneJacket,
        availableStock: null,
        errors: [],
      },
    }),
  );

  const outcome = await runCartAction({
    intent: "changeQuantity",
    lineId: "line-01",
    quantity: "3",
  });

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    lineId: "line-01",
    quantity: 3,
  });
  expect(outcome.problems).toEqual([]);
});

test("the action removes one line", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      removeCartLine: { cart: cartWithOneJacket, errors: [] },
    }),
  );

  const outcome = await runCartAction({
    intent: "removeLine",
    lineId: "line-01",
  });

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    lineId: "line-01",
  });
  expect(outcome.problems).toEqual([]);
});

test("the action applies a promotion code without the spaces around it", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      applyPromotionCode: { cart: cartWithPromotion, errors: [] },
    }),
  );

  await runCartAction({
    intent: "applyPromotionCode",
    promotionCode: "  welcome10  ",
  });

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    code: "welcome10",
  });
});

test("the action explains a promotion code the store refused", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      applyPromotionCode: {
        cart: cartWithOneJacket,
        errors: [
          { code: "CODE_EXPIRED", message: "The window closed.", field: null },
        ],
      },
    }),
  );

  const outcome = await runCartAction({
    intent: "applyPromotionCode",
    promotionCode: "SUMMER2025",
  });

  expect(outcome.problems).toEqual(["That promotion code has expired."]);
});

test("the action takes the promotion code off again", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      removePromotionCode: { cart: cartWithOneJacket, errors: [] },
    }),
  );

  const outcome = await runCartAction({ intent: "removePromotionCode" });

  expect(outcome.problems).toEqual([]);
});

test("the action refuses an intent the cart does not know", async () => {
  expect(await statusOfRefusal(runCartAction({ intent: "empty-everything" }))).toBe(
    400,
  );
});
```

`app/routes/checkout.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./checkout";
import { cartWithPromotion, emptyCart, placedOrder } from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader sends a visitor who is not signed in to the login screen", async () => {
  const connection = await openConnectionForTest();

  await expect(
    loader(
      routeArgumentsFor(
        connection,
        new Request(`${storeFrontAddress}/checkout`),
      ),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader sends a customer with an empty cart back to the cart", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ cart: emptyCart }));
  const connection = await openConnectionForTest({ signedIn: true });

  await expect(
    loader(
      routeArgumentsFor(
        connection,
        new Request(`${storeFrontAddress}/checkout`),
      ),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader makes one idempotency key per checkout attempt", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ cart: cartWithPromotion }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const first = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/checkout`)),
  );
  const second = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/checkout`)),
  );

  expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
  expect(first.customerName).toBe("Jane Doe");
});

test("the action places the order and sends the customer to the confirmation", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ placeOrder: { order: placedOrder, errors: [] } }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/checkout", {
        intent: "placeOrder",
        idempotencyKey: "checkout-key-01",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    idempotencyKey: "checkout-key-01",
  });
  expect(outcome).toMatchObject({ status: 302 });
  expect((outcome as Response).headers.get("Location")).toBe("/orders/order-01");
});

test("the action explains why the store refused to place the order", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      placeOrder: {
        order: null,
        errors: [
          { code: "CART_EMPTY", message: "Nothing to order.", field: null },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/checkout", {
        intent: "placeOrder",
        idempotencyKey: "checkout-key-02",
      }),
    ),
  );

  expect(outcome.problems).toEqual([
    "Your cart is empty, so there is nothing to order.",
  ]);
});
```

`app/routes/orderConfirmation.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { loader } from "./orderConfirmation";
import { placedOrder } from "~/testing/fixtures";
import {
  answerWith,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
  statusOfRefusal,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader sends a visitor who is not signed in to the login screen", async () => {
  const connection = await openConnectionForTest();

  await expect(
    loader(
      routeArgumentsFor(
        connection,
        new Request(`${storeFrontAddress}/orders/order-01`),
        { orderId: "order-01" },
      ),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader reads the order by the id in the address", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ order: placedOrder }));
  const connection = await openConnectionForTest({ signedIn: true });

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(`${storeFrontAddress}/orders/order-01`),
      { orderId: "order-01" },
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({ id: "order-01" });
  expect(loaded.order.number).toBe("ZM-1001");
});

test("the loader answers not found for an order of somebody else", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ order: null }));
  const connection = await openConnectionForTest({ signedIn: true });

  expect(
    await statusOfRefusal(
      loader(
        routeArgumentsFor(
          connection,
          new Request(`${storeFrontAddress}/orders/order-99`),
          { orderId: "order-99" },
        ),
      ),
    ),
  ).toBe(404);
});
```

`app/routes/account.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./account";
import {
  otherDeviceSession,
  placedOrder,
  thisDeviceSession,
} from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

const accountAnswer = {
  me: {
    id: "customer-01",
    name: "Jane Doe",
    email: "jane@example.com",
    createdAt: "2026-01-15T09:00:00Z",
    sessions: [thisDeviceSession, otherDeviceSession],
  },
  orders: { totalCount: 1, edges: [{ node: placedOrder }] },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader sends a visitor who is not signed in to the login screen", async () => {
  const connection = await openConnectionForTest();

  await expect(
    loader(
      routeArgumentsFor(connection, new Request(`${storeFrontAddress}/account`)),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader reads the customer, the sessions and a page of orders", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(accountAnswer));
  const connection = await openConnectionForTest({ signedIn: true });

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/account`)),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({ first: 10 });
  expect(loaded.customer.sessions).toHaveLength(2);
  expect(loaded.orders).toHaveLength(1);
  expect(loaded.orderCount).toBe(1);
});

test("the action revokes another session and keeps this one", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      revokeSession: { sessions: [thisDeviceSession], errors: [] },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/account", {
        intent: "revokeSession",
        sessionId: "session-02",
      }),
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    sessionId: "session-02",
  });
  expect(outcome.problems).toEqual([]);
  expect(connection.signedIn).toBe(true);
});

test("the action ends this session when the revoked one was this device", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      revokeSession: { sessions: [otherDeviceSession], errors: [] },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/account", {
        intent: "revokeSession",
        sessionId: "session-01",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(outcome).toMatchObject({ status: 302 });
  expect((outcome as Response).headers.get("Location")).toBe(
    "/login?reason=session-ended",
  );
  expect(connection.signedIn).toBe(false);
});

test("the action explains a session the store could not find", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      revokeSession: {
        sessions: [thisDeviceSession],
        errors: [
          {
            code: "SESSION_NOT_FOUND",
            message: "Gone already.",
            field: null,
          },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/account", {
        intent: "revokeSession",
        sessionId: "session-99",
      }),
    ),
  );

  expect(outcome.problems).toEqual(["That session is already closed."]);
});
```

`app/routes/wishlist.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./wishlist";
import { cottonJacket } from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader reads the wishlist the store keeps for an anonymous visitor", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ wishlist: [cottonJacket] }),
  );
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/wishlist`)),
  );

  expect(loaded.signedIn).toBe(false);
  expect(loaded.products).toHaveLength(1);
});

test("the loader says the customer is signed in once there is an access token", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith({ wishlist: [] }));
  const connection = await openConnectionForTest({ signedIn: true });

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/wishlist`)),
  );

  expect(loaded.signedIn).toBe(true);
  expect(loaded.products).toEqual([]);
});

test("the action takes a product off the wishlist", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ removeFromWishlist: { products: [], errors: [] } }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/wishlist", { productId: "product-03" }),
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    productId: "product-03",
  });
  expect(outcome.problems).toEqual([]);
});
```

`app/routes/login.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./login";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

const signedInAnswer = {
  login: {
    customer: { id: "customer-01", name: "Jane Doe" },
    accessToken: "access-token-01",
    accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    errors: [],
  },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader keeps a safe return address and reports an ended session", async () => {
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(
        `${storeFrontAddress}/login?returnTo=%2Fcheckout&reason=session-ended`,
      ),
    ),
  );

  expect(loaded.returnTo).toBe("/checkout");
  expect(loaded.sessionEnded).toBe(true);
});

test("the loader refuses a return address that leaves this store", async () => {
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(
        `${storeFrontAddress}/login?returnTo=https%3A%2F%2Felsewhere.example`,
      ),
    ),
  );

  expect(loaded.returnTo).toBe("/account");
});

test("the loader sends a customer who is already signed in onwards", async () => {
  const connection = await openConnectionForTest({ signedIn: true });

  await expect(
    loader(
      routeArgumentsFor(connection, new Request(`${storeFrontAddress}/login`)),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the action logs the customer in and follows the return address", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(signedInAnswer));
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/login", {
        email: " jane@example.com ",
        password: "correct horse battery staple",
        returnTo: "/checkout",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toMatchObject({
    input: {
      email: "jane@example.com",
      password: "correct horse battery staple",
    },
  });
  expect((outcome as Response).headers.get("Location")).toBe("/checkout");
  expect(connection.signedIn).toBe(true);
  expect(connection.customerName).toBe("Jane Doe");
});

test("the action explains a refused login and stays on the screen", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      login: {
        customer: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        errors: [
          {
            code: "CREDENTIALS_INVALID",
            message: "No match.",
            field: null,
          },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/login", {
        email: "jane@example.com",
        password: "wrong password here",
        returnTo: "/account",
      }),
    ),
  );

  expect(outcome.problems).toEqual([
    "That email address and password do not match.",
  ]);
  expect(connection.signedIn).toBe(false);
});
```

`app/routes/register.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./register";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader keeps the return address for after the registration", async () => {
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(`${storeFrontAddress}/register?returnTo=%2Fcart`),
    ),
  );

  expect(loaded.returnTo).toBe("/cart");
});

test("the action registers the customer and signs them in at once", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      register: {
        customer: { id: "customer-02", name: "Sam Rider" },
        accessToken: "access-token-02",
        accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
        errors: [],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/register", {
        name: " Sam Rider ",
        email: " sam@example.com ",
        password: "a long enough password",
        returnTo: "/cart",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toMatchObject({
    input: { email: "sam@example.com", name: "Sam Rider" },
  });
  expect((outcome as Response).headers.get("Location")).toBe("/cart");
  expect(connection.customerName).toBe("Sam Rider");
});

test("the action explains an email address the store already has", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      register: {
        customer: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        errors: [
          { code: "EMAIL_TAKEN", message: "Already here.", field: "input.email" },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/register", {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "a long enough password",
        returnTo: "/account",
      }),
    ),
  );

  expect(outcome.problems).toEqual([
    "An account with that email address already exists.",
  ]);
});
```

`app/routes/logout.data.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./logout";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("visiting the logout address in the browser leads back to the catalogue", async () => {
  const outcome = await loader();

  expect(outcome.status).toBe(302);
  expect(outcome.headers.get("Location")).toBe("/");
});

test("the action tells the store to close the session and forgets the tokens", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ logout: { success: true } }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(connection, formRequest("/logout", {})),
  );

  expect(vi.mocked(callStore)).toHaveBeenCalledTimes(1);
  expect(outcome.headers.get("Location")).toBe("/");
  expect(connection.signedIn).toBe(false);
  const headers = await connection.headers();
  expect(headers.get("Set-Cookie")).toContain("Max-Age=0");
});

test("the action leaves the store alone when nobody is signed in", async () => {
  const connection = await openConnectionForTest();

  await action(routeArgumentsFor(connection, formRequest("/logout", {})));

  expect(vi.mocked(callStore)).not.toHaveBeenCalled();
});
```

`app/store/shell.server.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { loadShell } from "./shell.server";
import {
  answerWith,
  openConnectionForTest,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the shell counts the quantities in the cart, not the lines", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      cart: { lines: [{ quantity: 2 }, { quantity: 3 }] },
      wishlist: [{ id: "product-03" }],
      me: null,
    }),
  );

  const shell = await loadShell(await openConnectionForTest());

  expect(shell.cartQuantity).toBe(5);
  expect(shell.wishlistCount).toBe(1);
  expect(shell.customerName).toBeNull();
});

test("the shell names the customer the store answers with", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      cart: { lines: [] },
      wishlist: [],
      me: { id: "customer-01", name: "Jane Doe" },
    }),
  );

  const shell = await loadShell(await openConnectionForTest({ signedIn: true }));

  expect(shell.customerName).toBe("Jane Doe");
});

test("the shell ends the session when the store no longer knows the access token", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ cart: { lines: [] }, wishlist: [], me: null }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const shell = await loadShell(connection);

  expect(shell.customerName).toBeNull();
  expect(connection.signedIn).toBe(false);
});
```

### The rest of the tests

`app/session/storeConnection.server.test.ts`

```ts
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { shellQuery } from "~/graphql/documents";
import { connectToStore } from "./storeConnection.server";
import {
  answerWith,
  requestWithSession,
  storeFrontAddress,
  statusOfRefusal,
} from "~/testing/storeTestSupport";

const freshSession = {
  customer: { id: "customer-01", name: "Jane Doe" },
  accessToken: "renewed-access-token",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  errors: [],
};

const emptyShell = {
  cart: { lines: [] },
  wishlist: [],
  me: null,
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("an anonymous visitor costs no refresh call", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(emptyShell));

  const connection = await connectToStore(
    new Request(`${storeFrontAddress}/`),
  );

  expect(connection.signedIn).toBe(false);
  expect(vi.mocked(callStore)).not.toHaveBeenCalled();
});

test("a session with a refresh cookie renews the access token before the first call", async () => {
  vi.mocked(callStore).mockResolvedValueOnce(
    answerWith({ refreshSession: freshSession }),
  );

  const connection = await connectToStore(
    await requestWithSession({ refreshCookie: "refresh-token-01" }),
  );

  expect(connection.signedIn).toBe(true);
  expect(connection.customerName).toBe("Jane Doe");
  expect(connection.sessionEnded).toBe(false);
  expect(vi.mocked(callStore)).toHaveBeenCalledTimes(1);
});

test("a refused renewal ends the session and says so", async () => {
  vi.mocked(callStore).mockResolvedValueOnce(
    answerWith({
      refreshSession: {
        customer: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        errors: [
          {
            code: "SESSION_INVALID",
            message: "That refresh token was already used.",
            field: null,
          },
        ],
      },
    }),
  );

  const connection = await connectToStore(
    await requestWithSession({
      refreshCookie: "already-rotated-token",
      accessToken: "old-access-token",
    }),
  );

  expect(connection.signedIn).toBe(false);
  expect(connection.sessionEnded).toBe(true);
});

test("a fresh access token is used again instead of renewed", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(emptyShell));

  const connection = await connectToStore(
    await requestWithSession({
      refreshCookie: "refresh-token-01",
      accessToken: "still-fresh",
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
      accessTokenObtainedAt: new Date().toISOString(),
    }),
  );
  await connection.run(shellQuery, {});

  expect(vi.mocked(callStore)).toHaveBeenCalledTimes(1);
  expect(vi.mocked(callStore).mock.calls[0]?.[2]).toMatchObject({
    accessToken: "still-fresh",
  });
});

test("the cart cookie the API sets is kept and sent back on the next call", async () => {
  vi.mocked(callStore).mockResolvedValue({
    data: emptyShell,
    failureMessage: null,
    setCookieHeaders: [
      "zappy_cart=cart-token-01; Path=/; HttpOnly; SameSite=Lax",
    ],
  });

  const connection = await connectToStore(
    new Request(`${storeFrontAddress}/`),
  );
  await connection.run(shellQuery, {});
  await connection.run(shellQuery, {});

  expect(vi.mocked(callStore).mock.calls[1]?.[2]).toMatchObject({
    cartCookie: "cart-token-01",
  });
  const headers = await connection.headers();
  expect(headers.get("Set-Cookie")).toContain("zappy_store_front=");
});

test("a store that answers nothing becomes a bad gateway", async () => {
  vi.mocked(callStore).mockResolvedValue({
    data: null,
    failureMessage: "The store is asleep.",
    setCookieHeaders: [],
  });

  const connection = await connectToStore(
    new Request(`${storeFrontAddress}/`),
  );

  expect(await statusOfRefusal(connection.run(shellQuery, {}))).toBe(502);
});
```

`app/session/sessionCookie.server.test.ts`

```ts
import { expect, test } from "vitest";
import {
  decryptSession,
  emptyStoreFrontSession,
  encryptSession,
  readStoreFrontSession,
  writeStoreFrontSession,
} from "./sessionCookie.server";

const session = {
  ...emptyStoreFrontSession,
  accessToken: "access-token-01",
  refreshCookie: "refresh-token-01",
  customerName: "Jane Doe",
};

test("a session survives the trip through the cookie", async () => {
  const setCookie = await writeStoreFrontSession(session);
  const request = new Request("http://localhost:5173/", {
    headers: { Cookie: setCookie.split(";")[0] ?? "" },
  });

  expect(await readStoreFrontSession(request)).toEqual(session);
});

test("the cookie carries no token in the clear", async () => {
  const setCookie = await writeStoreFrontSession(session);

  expect(setCookie).not.toContain("access-token-01");
  expect(setCookie).not.toContain("refresh-token-01");
  expect(setCookie).not.toContain("Jane Doe");
});

test("the cookie is closed to scripts and stays on this site", async () => {
  const setCookie = await writeStoreFrontSession(session);

  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=Lax");
});

test("a session that was tampered with reads as no session at all", () => {
  const encrypted = encryptSession(session);
  const tampered = `${encrypted.slice(0, -4)}AAAA`;

  expect(decryptSession(tampered)).toEqual(emptyStoreFrontSession);
});

test("a request without the cookie reads as no session at all", async () => {
  const request = new Request("http://localhost:5173/");

  expect(await readStoreFrontSession(request)).toEqual(emptyStoreFrontSession);
});
```

`app/session/deviceDescription.test.ts`

```ts
import { expect, test } from "vitest";
import { describeDevice } from "./deviceDescription";

test("a browser and a system become one readable line", () => {
  expect(
    describeDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    ),
  ).toBe("Chrome on Windows");
});

test("Edge is named before Chrome, whose marker it also carries", () => {
  expect(
    describeDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    ),
  ).toBe("Edge on Windows");
});

test("a system without a browser marker is still worth saying", () => {
  expect(describeDevice("Mozilla/5.0 (Linux; rv:1.0)")).toBe("Linux");
});

test("nothing to go on becomes an honest unknown", () => {
  expect(describeDevice(null)).toBe("Unknown browser");
  expect(describeDevice("   ")).toBe("Unknown browser");
  expect(describeDevice("curl/8.4.0")).toBe("Unknown browser");
});
```

`app/graphql/setCookies.test.ts`

```ts
import { expect, test } from "vitest";
import { buildCookieHeader, readCookieChanges } from "./setCookies";

test("a set cookie header becomes a name and a value", () => {
  const changes = readCookieChanges([
    "zappy_cart=cart-token-01; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);

  expect(changes.get("zappy_cart")).toBe("cart-token-01");
});

test("an empty value means the store took the cookie away", () => {
  const changes = readCookieChanges([
    "zappy_refresh=; Path=/graphql; Max-Age=0",
  ]);

  expect(changes.has("zappy_refresh")).toBe(true);
  expect(changes.get("zappy_refresh")).toBeNull();
});

test("an age of zero means the store took the cookie away", () => {
  const changes = readCookieChanges(["zappy_cart=stale; Max-Age=0"]);

  expect(changes.get("zappy_cart")).toBeNull();
});

test("a date in the past means the store took the cookie away", () => {
  const changes = readCookieChanges([
    "zappy_cart=stale; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ]);

  expect(changes.get("zappy_cart")).toBeNull();
});

test("a header without a name and a value is skipped", () => {
  const changes = readCookieChanges(["nonsense", ""]);

  expect(changes.size).toBe(0);
});

test("the cookie header names only the cookies that carry a value", () => {
  expect(
    buildCookieHeader({
      zappy_cart: "cart-token-01",
      zappy_refresh: null,
    }),
  ).toBe("zappy_cart=cart-token-01");
});

test("no cookie at all means no cookie header", () => {
  expect(buildCookieHeader({ zappy_cart: null })).toBeNull();
});
```

`app/store/catalogueSearch.test.ts`

```ts
import { expect, test } from "vitest";
import {
  buildProductFilter,
  catalogueAddress,
  readCatalogueSearch,
} from "./catalogueSearch";

function searchIn(query: string) {
  return readCatalogueSearch(new URL(`http://localhost:5173/${query}`));
}

test("an address without a query asks for nothing in particular", () => {
  expect(searchIn("")).toEqual({
    categorySlug: null,
    searchTerm: null,
    inStockOnly: false,
    after: null,
  });
});

test("the category, the search term and the stock switch come out of the address", () => {
  expect(searchIn("?category=jewellery&search=ring&inStock=true")).toEqual({
    categorySlug: "jewellery",
    searchTerm: "ring",
    inStockOnly: true,
    after: null,
  });
});

test("an empty field counts as no filter at all", () => {
  expect(searchIn("?category=&search=%20%20").categorySlug).toBeNull();
  expect(searchIn("?category=&search=%20%20").searchTerm).toBeNull();
});

test("a search without a filter needs no filter argument", () => {
  expect(buildProductFilter(searchIn(""))).toBeNull();
});

test("a search with a filter becomes the contract's filter shape", () => {
  expect(buildProductFilter(searchIn("?search=jacket"))).toEqual({
    categorySlug: null,
    nameContains: "jacket",
    inStockOnly: null,
  });
});

test("the stock switch is only sent when it is on", () => {
  expect(buildProductFilter(searchIn("?inStock=true"))?.inStockOnly).toBe(true);
});

test("the address of a page keeps the filter and changes the cursor", () => {
  const search = searchIn("?category=jewellery&search=ring");

  expect(catalogueAddress(search, { after: "cursor-08" })).toBe(
    "/?category=jewellery&search=ring&after=cursor-08",
  );
});

test("the address of the first page drops the cursor", () => {
  const search = searchIn("?category=jewellery&after=cursor-08");

  expect(catalogueAddress(search, { after: null })).toBe("/?category=jewellery");
});

test("an address with nothing to say is the catalogue itself", () => {
  expect(catalogueAddress(searchIn(""), {})).toBe("/");
});
```

`app/store/money.test.ts`

```ts
import { expect, test } from "vitest";
import { formatMoney, totalQuantity } from "./money";

test("an amount in cents reads as an amount in euro", () => {
  expect(formatMoney({ amount: 5599, currency: "EUR" })).toBe("€55.99");
});

test("a whole euro amount keeps its two decimals", () => {
  expect(formatMoney({ amount: 500, currency: "EUR" })).toBe("€5.00");
});

test("nothing costs nothing", () => {
  expect(formatMoney({ amount: 0, currency: "EUR" })).toBe("€0.00");
});

test("the cart count is the sum of the quantities, not the number of lines", () => {
  expect(totalQuantity([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  expect(totalQuantity([])).toBe(0);
});
```

`app/store/returnTo.test.ts`

```ts
import { expect, test } from "vitest";
import { safeReturnTo } from "./returnTo";

test("an address inside this store is kept", () => {
  expect(safeReturnTo("/checkout", "/account")).toBe("/checkout");
});

test("an address on another host falls back", () => {
  expect(safeReturnTo("https://elsewhere.example/steal", "/account")).toBe(
    "/account",
  );
});

test("a protocol relative address falls back", () => {
  expect(safeReturnTo("//elsewhere.example", "/account")).toBe("/account");
});

test("no address at all falls back", () => {
  expect(safeReturnTo(null, "/account")).toBe("/account");
  expect(safeReturnTo("", "/account")).toBe("/account");
});
```

### The end to end suite

The shared Playwright suite in `../../tools/end-to-end` drives this store
front through a browser. Start the API and the store front, then:

```
cd ../../tools/end-to-end
npm install
npx playwright install chromium
npm test
```

A passing run prints:

```
Running 4 tests using 1 worker

  ok 1 [chromium] › tests\catalogueToPlacedOrder.spec.ts:13:1 › a visitor filters the catalogue, fills a cart, uses a promotion code and places an order (1.9s)
  ok 2 [chromium] › tests\sessionsAndReplay.spec.ts:25:1 › a customer registers, logs in twice, revokes the other session and cannot replay a dead one (2.9s)
  ok 3 [chromium] › tests\storeFrontIsUp.spec.ts:4:1 › the catalogue answers with products, a filter and the shop chrome (413ms)
  ok 4 [chromium] › tests\withoutJavaScript.spec.ts:6:1 › the catalogue filter and the cart forms work without JavaScript @progressive-enhancement (1.2s)

  4 passed (8.8s)
```

## Why there is no client store for server data

There is no Redux, no Zustand, no urql cache and no React Query in this
project, and every piece of data on a screen comes from a loader as a
property. That is the point of the framework, and it is worth saying why
rather than leaving it as a habit.

A client store for server data is a second copy of the truth. The moment
it exists, somebody has to decide when it is stale, what invalidates it,
what happens to it on a mutation, and what a component should show while
the two copies disagree. Those questions are the bulk of the code in most
front ends that have one, and none of them is about the store this project
sells.

React Router already answers them. A loader is the read. An action is the
write. After an action, React Router calls the loaders of the routes on
screen again, so the answer to "what does the cart look like now" comes
back from the one place that knows, the API. There is nothing to
invalidate, because nothing was kept. The cart count in the header updates
after a fetcher submits a quantity change, and no line of code in this
project wires those two together.

The one thing this store front does keep on the client is the quantity a
visitor just typed, read from `fetcher.formData` while the request is in
flight. That is not a copy of server data. It is the request, rendered.

Two consequences follow, and both are visible in the code. The GraphQL
client is `@urql/core` alone, without the React bindings that the `urql`
package adds, because no component subscribes to a document. And the
anonymous wishlist is not in local storage: the store keeps it against the
`zappy_cart` cookie and merges it into the customer's wishlist on login,
which is one truth in one place instead of two that have to be reconciled.

The cost is real and it is worth naming. Every navigation is a round trip
to the React Router server and from there to the API. A store front that
needs to feel instant offline would make a different choice. This one
serves a catalogue over a network that is already there, so it pays the
round trip and keeps the code that would have managed a cache.

## What is deliberately not here

- No product photography. `../../docs/domain.md` puts it out of scope, so
  the store draws a placeholder from the product's name.
- No pagination beyond a next page and a first page link. The catalogue
  has twenty products.
- No client side cache, for the reason above.
- No design system. Plain Tailwind, and the same plain Tailwind in the
  other two frontends, so a reader comparing the three sees the framework
  and not the styling.
