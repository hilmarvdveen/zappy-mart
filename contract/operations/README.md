# Conformance operations

One `.graphql` document per scenario, with its variables in a `.json`
file of the same name beside it, and the expected answer in
`../expected/` under the same name. Written with item Z2, run by
`tools/conformance/` against any backend.

The order the runner uses, so later scenarios can rely on earlier ones:

1. `catalogue-list` and `catalogue-filter-by-category`
2. `product-by-slug` and `product-unknown-slug`
3. `cart-add`, `cart-add-again-raises-quantity`, `cart-add-above-stock`
4. `promotion-apply-percentage`, `promotion-apply-expired`, `promotion-replace`
5. `register`, `register-duplicate-email`, `login`, `login-wrong-password`
6. `refresh-session`, `refresh-session-replayed`, `logout`
7. `wishlist-add`, `wishlist-remove`, `wishlist-merge-on-login`
8. `order-place`, `order-place-empty-cart`, `orders-list`
9. `mutation-without-origin` (must be refused before the resolver)

Placeholders in the expected answers: `@id`, `@dateTime`, `@token`,
`@cursor`. The runner accepts any value of the right shape there.
