# The seed data

Every backend loads this folder at start in its development profile, and
loads it again whenever the `resetSeed` mutation of
`contract/schema.development.graphql` is called. The conformance runner in
`tools/conformance/` calls that mutation before every scenario, so all
three backends answer the operations in `contract/operations/` with the
data below and the expected answers in `contract/expected/` hold for each
of them.

The catalogue derives from the twenty products of the Angular
application's `frontends/angular/src/assets/products.json`, which is where
Zappy Mart started in April 2025. The titles, the prices and the four
categories are the ones from that file. The prices became integer amounts
in cents, the category names became readable names with a slug, the
descriptions were cleaned of double spacing and repeated sentences, and
the external image links became local placeholder paths.

## The files

| File | Holds |
|---|---|
| `categories.json` | the four categories, in the order the `categories` query answers with |
| `products.json` | the twenty products, in the catalogue order the `products` query pages through |
| `promotion-codes.json` | the five promotion codes and the state of their usage |
| `customers.json` | the one registered customer |

The seed holds no carts, no orders and no sessions. A run starts with an
empty cart for every visitor, an empty order history and no session, so a
scenario that places an order starts from a known nothing.

## The ids

Each file gives an `id`. A backend loads it as the id it answers with, so
a conformance document can write `productId: "product-07"` and mean the
product with no stock. That is a property of this seed and not permission
for a client to read anything into an id: `Product.id`, `Category.id` and
`Customer.id` stay opaque strings in the contract, and a client stores
them and sends them back without parsing them.

Cart line ids, order ids, order numbers and session ids are made by the
backend at run time and differ per backend, so the expected answers carry
placeholders for them.

## `categories.json`

| Field | Type | What it is |
|---|---|---|
| `id` | string | the id the backend answers as `Category.id` |
| `name` | string | the name to show, for example `Men's clothing` |
| `slug` | string | the url identifier, and the value `ProductFilter.categorySlug` takes |

The four categories are `mens-clothing`, `jewellery`, `electronics` and
`womens-clothing`. The Angular data spells the third category `jewelery`,
which is a misspelling in the sample API it came from, so the seed gives
it the readable name `Jewellery` and the slug `jewellery`.

## `products.json`

| Field | Type | What it is |
|---|---|---|
| `id` | string | `product-01` to `product-20`, in catalogue order |
| `name` | string | the name to show, from the title in the Angular data |
| `slug` | string | the url identifier, and the value the `product` query takes |
| `description` | string | the product page text, plain text with no markup |
| `price.amount` | integer | the price in cents, never a float |
| `price.currency` | string | `EUR` for every product, because the store sells in one currency |
| `categorySlug` | string | the `slug` of one of the four categories |
| `stock` | integer | how many are available, between 0 and 25 |
| `imageUrl` | string | `/images/products/<slug>.svg` |

The order of the file is the catalogue order. `products(first: 24)`
answers `product-01` first and `product-20` last, and every backend pages
through the list in that order, so one expected answer fits all three.

`imageUrl` is a path and not a link. The contract holds no binary: each
frontend serves the drawings from its own static folder under
`/images/products/`. Product photography is out of scope, as `domain.md`
says, so the drawings are placeholders.

Two stock values carry rules the conformance run tests, so they are fixed
and no other product may take them:

- `product-07`, the White Gold Plated Princess ring, has a stock of 0. It
  is shown in the catalogue and on its own page like any other product,
  and adding it to a cart is refused with `OUT_OF_STOCK`. It is also the
  product `ProductFilter.inStockOnly` leaves out, which makes the filter
  observable: 20 products without it and 19 with it.
- `product-12`, the WD 4TB Gaming Drive, has a stock of 1. Adding one
  succeeds and adding a second is refused with `OUT_OF_STOCK` and an
  `availableStock` of 1, which is how a scenario reaches the refusal
  without emptying a larger stock first.

The other eighteen products have a stock of 2 or more, so exactly one
product is out of stock and exactly one is down to its last item.

## `promotion-codes.json`

| Field | Type | What it is |
|---|---|---|
| `code` | string | the code in upper case, which is how `applyPromotionCode` normalises what the visitor types |
| `kind` | string | `PERCENTAGE`, `FIXED_AMOUNT` or `FREE_SHIPPING`, the values of `PromotionKind` |
| `percentage` | integer or null | the percentage off the subtotal, filled for a `PERCENTAGE` code and null for the other two |
| `amount` | money or null | the amount off the subtotal, filled for a `FIXED_AMOUNT` code and null for the other two |
| `minimumSubtotal` | money or null | the subtotal the cart needs before the code applies, or null when the code has no minimum |
| `validFrom` | date and time | the first moment the code applies, in UTC |
| `validUntil` | date and time | the last moment the code applies, in UTC |
| `usageLimit` | integer or null | how often the code may be used in total, or null for no limit |
| `timesUsed` | integer | how often the code has already been used when the seed is loaded |

A money value is the same shape as a price: `{ "amount": <cents>,
"currency": "EUR" }`.

The five codes cover the five answers `applyPromotionCode` can give:

| Code | Kind | Window | Limit and uses | What it proves |
|---|---|---|---|---|
| `WELCOME10` | 10 percent off the subtotal | 1 January 2026 to 31 December 2027 | no limit | the happy path of a percentage code |
| `FIVEOFF` | 500 cents off, minimum subtotal 2500 | 1 January 2026 to 31 December 2027 | no limit | the happy path of a fixed amount code, and `CODE_MINIMUM_NOT_MET` on a cart below 2500 |
| `FREESHIP` | free shipping | 1 January 2026 to 31 December 2027 | no limit | shipping falls to zero on a cart that would otherwise pay 495 |
| `SUMMER2025` | 10 percent off the subtotal | 1 June 2025 to 31 August 2025 | no limit | `CODE_EXPIRED`, because the window closed before today |
| `ONCE` | 10 percent off the subtotal | 1 January 2026 to 31 December 2027 | limit 1, used 1 | `CODE_EXHAUSTED`, because the one use is already recorded |

A code that is not in this list answers `CODE_UNKNOWN`, so a scenario can
use any text at all for that case.

The windows of the three working codes run to the end of 2027, so a
conformance run stays green without editing the seed. When that date comes
close, the window moves in one change that touches this file and the
expected answers together.

`timesUsed` is what the seed loads, not a running count of the current
run. The Promotions module raises it on the `OrderPlaced` event, so an
order placed with `WELCOME10` during a run moves that code from 0 to 1
until the next `resetSeed` puts it back.

## `customers.json`

| Field | Type | What it is |
|---|---|---|
| `id` | string | the id the backend answers as `Customer.id` |
| `email` | string | `jane@example.com`, stored in lower case |
| `name` | string | `Jane Doe`, the name in the greeting and on the confirmation mail |
| `password` | string | the password in clear, so a scenario can log in with it |
| `createdAt` | date and time | when the customer registered, in UTC |
| `wishlist` | list of product ids | empty, so a wishlist scenario starts from nothing |

The password is in clear in this file and only in this file. It is
`correct horse battery staple`, twenty eight characters, which clears the
twelve character minimum in `docs/security.md`. A backend hashes it with
Argon2id while it loads the seed and stores the hash, exactly as it does
for a password that arrives through `register`. No backend stores this
string, logs it or answers with it. The seed is test data in a repository
that is a tutorial, and this password belongs to no real account
anywhere.

A scenario that registers a second customer uses `jane@example.com` to
reach `EMAIL_TAKEN`, and any other address for the happy path.

## The totals, worked through the seed

The rule is in the Ordering section of `docs/domain.md`:
`total = subtotal + shipping - discount`, shipping is 495 cents and zero
when the subtotal reaches 5000 or when a free shipping code applies, and a
percentage discount is rounded half up to whole cents. Three carts out of
this seed:

| Cart | Code | Subtotal | Shipping | Discount | Total |
|---|---|---|---|---|---|
| one `product-18` twice | none | 1970 | 495 | 0 | 2465 |
| one `product-18` twice | `FREESHIP` | 1970 | 0 | 0 | 1970 |
| one `product-03` | `WELCOME10` | 5599 | 0 | 560 | 5039 |

The middle row is why a free shipping code has a discount of zero: its
effect is already in the shipping. The last row rounds 559.9 up to 560 and
pays no shipping, because the subtotal passed 5000 on its own.

## Changing the seed

A change here is a change to the contract. The schema, the operations, the
expected answers and every backend move in one go, the same rule
`docs/contract.md` sets for the schema itself. In particular, moving a
stock value, a price or a promotion window changes an expected answer, and
the conformance runner is what says so.
