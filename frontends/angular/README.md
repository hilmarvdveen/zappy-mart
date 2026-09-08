# ZappyMart Frontend

ZappyMart is an Angular application for browsing a product catalogue and keeping a
wishlist. It shows reactive state with Angular signals, standalone components, zoneless
change detection and styling in SCSS with BEM naming.

## Requirements

Node.js `^22.22.3 || ^24.15.0 || ^26.0.0`, which is what Angular 22 supports. The
application is developed on Node 24.

## Project structure

```
src/
├── app/
│   ├── app.component.*      the shell: the header and the router outlet
│   ├── app.routes.ts        the route table
│   ├── header/              the top navigation with the wishlist button
│   ├── home/                the home page: the product list and the wishlist drawer
│   ├── over-ons/            the about page
│   ├── products/            the product list
│   └── wish-list-drawer/    the side drawer that shows the wishlist
├── shared/
│   ├── components/          the product card
│   ├── models/              the product model
│   └── services/            local storage, the product api, the signal store, the wishlist
├── assets/                  the fonts, the logo and the product catalogue
└── main.ts                  bootstrapApplication with provideRouter and provideHttpClient
```

## How it is put together

- **Standalone components.** The application has no NgModule. `main.ts` calls
  `bootstrapApplication`, and every component lists the components and directives it uses
  in its own `imports`.
- **Zoneless change detection.** `zone.js` is not installed and the build has no polyfill
  entry. Angular 22 runs zoneless by default. A view is checked again when a signal it
  read has changed or when one of its own event handlers ran.
- **`OnPush` for every component**, which is the Angular 22 default. State reaches the
  templates as signals: `ProductSignalStoreService.products` for the catalogue,
  `WishListService.count` and `WishListService.wishlist` for the wishlist,
  `WishListDrawerService.isOpen` for the drawer. The product card receives its data
  through inputs, so it is checked again whenever its parent passes a new value.
- **Signals as the store.** `ProductSignalStoreService` owns the catalogue, the loading
  flag and the error. `WishListService` owns the wishlist and writes every change to local
  storage, so the wishlist survives a reload.
- **The active menu link** comes from the router's `isActive` signal, so the navigation
  updates itself after a navigation without any subscription.

## Getting started

Install the dependencies and start the development server:

```bash
npm install
npm start
```

Open http://localhost:4200. The application reloads on every change.

## Build

```bash
npm run build
```

The bundle lands in `dist/zappy-mart-frontend`.

## Testing

The unit tests run on Jest through `jest-preset-angular`, which supports Angular 22 and
ships a zoneless test environment. `src/setup-jest.ts` calls `setupZonelessTestEnv`, so the
tests run the same change detection as the browser.

```bash
npm test
npm run test:watch
npm run test:coverage
```

A passing run prints `Test Suites: 7 passed, 7 total` and `Tests: 37 passed, 37 total`.

## Linting and formatting

```bash
npm run lint
npm run lint:fix
npm run format
```

`npm run lint` runs ESLint through the angular-eslint builder over `src/**/*.ts` and
`src/**/*.html`. A passing run prints `All files pass linting.`

## Versions

`docs/versions.md` in the repository root is the one place for versions. The application
runs:

| Package                          | Version |
| -------------------------------- | ------- |
| Angular                          | 22.1.5  |
| Angular CLI and `@angular/build` | 22.1.7  |
| TypeScript                       | 6.0.3   |
| RxJS                             | 7.8     |
| Jest                             | 30.5.1  |
| jest-preset-angular              | 17.0.0  |
| ESLint                           | 10.10.0 |
| angular-eslint                   | 22.5.0  |
| typescript-eslint                | 8.70.0  |
| Prettier                         | 3.9.6   |

## Routes

| Path          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `/`           | the home page with the product list and the wishlist drawer |
| `/over-ons`   | the about page                                              |
| anything else | redirects to `/`                                            |

## The wishlist

The heart button in the header opens the drawer and carries a counter badge. It is
disabled while the wishlist is empty. Every product card has a button that adds the
product to the wishlist or takes it out again. `WishListService` is the one owner of that
state and `LocalStorageService` persists it under the key `wishlist`.
