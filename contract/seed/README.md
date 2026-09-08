# Seed data

The data every backend loads in its development profile and reloads
through the `resetSeed` mutation, so all three backends answer the
conformance operations from the same store.

| File | Holds |
|---|---|
| `categories.json` | the four categories with their slugs |
| `products.json` | the twenty products with their prices in cents and their stock |
| `promotion-codes.json` | the five promotion codes with their windows, limits and recorded uses |
| `customers.json` | the one customer, with the password in clear |
| `seed.md` | every field of every file, the rules the values carry, and the worked totals |

Read `seed.md` first. It is the description of this folder, and it says
why `product-07` has no stock, why `product-12` has one item left, what
each of the five codes proves, and that a backend hashes the customer's
password with Argon2id while it loads the seed.

The catalogue derives from the twenty products of
`frontends/angular/src/assets/products.json`, where Zappy Mart started.
Delivered with item Z2, together with schema 1.0 in
`../schema.graphql`.
