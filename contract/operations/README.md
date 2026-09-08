# Conformance operations

One `.graphql` document per scenario, with its variables in a `.json`
file of the same name beside it, and the expected answer in
`../expected/` under the same name. Written with item Z2, run by
`tools/conformance/` against any backend.

The runner calls `resetSeed` once, before the first scenario, and then
runs the thirty three scenarios below in this order. Each one starts
where the one before it left off: the cart the cart scenarios build is
the cart the promotion scenarios discount and the order scenario buys,
and the access token a login answers with is the token the next scenario
sends. `tools/conformance/documents.mjs` holds the same order in code and
fails when a document here is missing from that list or missing from this
folder.

| # | Scenario | What it proves |
|---|---|---|
| 1 | `catalogue-list` | the catalogue pages in the order of `../seed/products.json`, with the total across every page |
| 2 | `catalogue-filter-by-category` | `categorySlug` narrows the catalogue, and a product with no stock is still listed |
| 3 | `product-by-slug` | one product by its url identifier, with its price in cents and its category |
| 4 | `product-unknown-slug` | an unknown slug answers null and not an error |
| 5 | `cart-add` | a line is created, and the subtotal, the shipping charge and the total follow the rule in `docs/domain.md` |
| 6 | `cart-add-again-raises-quantity` | adding a product that is already on a line raises the quantity instead of adding a second line |
| 7 | `cart-add-above-stock` | `OUT_OF_STOCK` with `availableStock`, and the cart unchanged |
| 8 | `promotion-apply-percentage` | a percentage code, rounded half up, and the code found without regard to case |
| 9 | `promotion-apply-expired` | `CODE_EXPIRED`, and the cart keeps the code it had |
| 10 | `promotion-apply-exhausted` | `CODE_EXHAUSTED` for a code at its usage limit |
| 11 | `promotion-apply-below-minimum` | `CODE_MINIMUM_NOT_MET` for a cart under the code's minimum subtotal |
| 12 | `promotion-replace` | applying a second code replaces the first, and a free shipping code shows in the shipping and not in the discount |
| 13 | `promotion-remove` | the cart pays the shipping charge again once the code is gone |
| 14 | `register` | a customer is created, signed in and given an access token, the email address is normalised to lower case, and the anonymous cart moves to the customer |
| 15 | `register-duplicate-email` | `EMAIL_TAKEN` for the address the seed already holds |
| 16 | `login` | the seed customer signs in, the email address is compared without regard to case, and the session list holds the login |
| 17 | `login-wrong-password` | `CREDENTIALS_INVALID` with no field, so the answer names neither half of the pair |
| 18 | `refresh-session` | the refresh cookie is exchanged for a new access token and a new refresh cookie |
| 19 | `refresh-session-replayed` | the rotated refresh token is refused with `SESSION_INVALID` and the session family is revoked |
| 20 | `logout` | logging out is not an error when the session is already gone, and a client throws its access token away |
| 21 | `login-again` | the customer signs in on a named device, and the sessions the replay revoked are not in the list |
| 22 | `login-second-device` | a second device is a second session, newest first, and the session the login just made is the current one |
| 23 | `revoke-session` | the customer ends the login on the device they no longer have, and the answer is the sessions that are left |
| 24 | `logout-again` | the live session the run is signed in on is revoked and the refresh cookie cleared |
| 25 | `revoke-session-signed-out` | `revokeSession` refuses a request with no customer |
| 26 | `wishlist-add` | an anonymous visitor's wishlist holds the product |
| 27 | `wishlist-remove` | the product leaves the wishlist |
| 28 | `wishlist-merge-on-login` | a product added anonymously is on the customer's wishlist after the login in the same document |
| 29 | `order-place` | the order keeps the names, prices and totals of the moment, and is placed as paid |
| 30 | `order-place-empty-cart` | `CART_EMPTY`, because placing the order emptied the cart |
| 31 | `orders-list` | the customer's order history, newest first |
| 32 | `order-by-id` | one order by the id the placement answered with |
| 33 | `mutation-without-origin` | a mutation with no `Origin` header is refused before the resolver runs, so the answer is a GraphQL error and no data |

## The cart the scenarios build

The cart holds three of `product-19`, at 795 cents each. That choice
carries two rules. A subtotal of 2385 stays under the 2500 minimum of
`FIVEOFF`, so scenario 11 reaches `CODE_MINIMUM_NOT_MET`, and ten percent
of 2385 is 238.5, so scenario 8 has to round half up to 239. Under 5000
the cart pays the shipping charge of 495, which is what makes scenario 12
visible: `FREESHIP` takes the 495 away and leaves the discount at zero.

## Who is signed in

Scenario 14 registers `sam@example.com` and the anonymous cart moves to
that customer, so Sam is who places the order in scenario 29. Scenario 16
signs in the seed customer `jane@example.com`, and scenarios 18 and 19
rotate and then replay that session's refresh token, which revokes it.

Scenarios 21 to 25 are the session list a customer manages. Jane signs in
on a `laptop` and then on a `phone`, so she has two sessions, and the
answer of scenario 22 names both with the phone as the current one.
Scenario 23 revokes the laptop, which is the session the runner carries
as `$otherSessionId`, and the answer holds the phone alone. Scenario 24
logs the phone out, which is what makes scenario 25 reach
`NOT_AUTHENTICATED` and what makes the wishlist scenarios after it
anonymous.

Scenario 28 signs Sam in once more. That is the login the anonymous
wishlist merges into, and the session the order scenarios run on.

## The two root fields of the merge document

`wishlist-merge-on-login` adds a product and logs in, in one document.
GraphQL runs the root fields of a mutation one after the other, so the
answer shows the anonymous wishlist first and the customer's wishlist
after the merge. It is one scenario because the merge is one rule, and a
rule is what a scenario proves. Every other document has one root field.

## The three promotion kinds

`WELCOME10` proves the percentage rule in scenario 8 and `FREESHIP`
proves the free shipping rule in scenario 12. `FIVEOFF`, the fixed amount
code, appears in scenario 11 as the refusal its minimum subtotal causes,
because one cart grows through the run and a cart that clears 2500 can no
longer reach that refusal.

## Placeholders

The expected answers carry `@id`, `@dateTime`, `@token` and `@cursor`
where the value differs per run. `../expected/README.md` says what each
one matches.
