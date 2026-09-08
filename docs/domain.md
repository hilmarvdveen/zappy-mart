# The domain

Zappy Mart sells a small catalogue of physical products to customers who
register with an email address. The store is deliberately small: large
enough to need real rules, small enough to read in an afternoon.

## Modules

### Catalogue

Owns products, categories, prices and stock.

- A product has a name, a slug, a description, one price in one currency,
  a category and a stock count.
- A product with zero stock is shown in the catalogue and cannot be added
  to a cart.
- A category has a name and a slug. A product belongs to exactly one
  category.
- Prices are `Money`: an integer amount in the smallest unit and a
  currency code. No floating point anywhere near a price.

### Cart

Owns the customer's cart and its lines. An anonymous visitor has a cart
too, identified by a cart id in a cookie, and the cart moves to the
customer on login.

- A line has a product and a quantity of at least one.
- Adding a product that is already in the cart raises the quantity.
- A quantity above the stock is refused with the stock in the answer.
- The cart total is derived from the lines and the promotion, never
  stored.

### Promotions

Owns promotion codes and their rules.

- Three kinds of code: a percentage off the lines, a fixed amount off the
  total, and free shipping.
- A code has a validity window and an optional usage limit.
- One code per cart. Applying a second replaces the first.
- A code that is unknown, expired, exhausted or below its minimum is
  refused with the reason.

### Ordering

Owns placing an order from a cart and the order history.

- An order is placed from a cart with at least one line.
- Placing an order reserves stock. If any line cannot be reserved, no
  order is placed and the answer names the product.
- An order keeps the product names and prices of the moment it was
  placed. A later price change does not touch it.
- Shipping is a charge and nothing else. It is 495 cents. It is zero when
  the subtotal is 5000 cents or more, and it is zero when a free shipping
  code applies. An empty cart has no shipping charge. The charge sits on the cart while the visitor shops and is
  copied onto the order when the order is placed. Addresses, carriers and
  delivery dates stay out of scope, so this one amount is the whole of
  shipping in this store. `Cart.shipping` and `Order.shipping` in
  `contract/schema.graphql` point at this rule.
- The totals hold one equation, on the cart and on the order alike:
  `total = subtotal + shipping - discount`. The subtotal is the sum of the
  line totals. A percentage code discounts that percentage of the
  subtotal, rounded half up to whole cents. A fixed amount code discounts
  its own amount, capped at the subtotal. A free shipping code discounts
  nothing and makes the shipping zero instead, so the equation needs no
  exception for it.
- Payment is simulated: an order is placed as paid. The step exists so a
  reader sees where a payment provider would go.
- Placing an order raises the domain event `OrderPlaced`, which the mail
  adapter turns into a confirmation and which the promotion module uses
  to count a code's use.

### Accounts

Owns customers, registration, login, sessions and the wishlist.

- An email address is unique and is a value object that normalises case.
- A password is hashed with Argon2id and never stored or logged in clear.
- A login creates a session. A session can be listed and revoked by its
  customer. The token model is in `security.md`.
- A wishlist is a set of products a customer wants to find again. An
  anonymous visitor's wishlist is kept against the `zappy_cart` cookie,
  like the cart, and it merges into the customer's wishlist on login by
  adding and never replacing, the same way the cart does.

## Shared kernel

Kept to three things: `Money`, `EmailAddress` and the `Result` type that
every use case answers with. Everything else belongs to one module.

## Out of scope, on purpose

Real payment, shipping and addresses, an administrative interface,
product images beyond a placeholder, search beyond a name filter,
multiple currencies in one store, taxes. Each would double the size of
every project without teaching anything the modules above do not teach.

## Seed data

`contract/seed/` holds the products, categories, promotion codes and one
customer that every backend loads at start in development and in the
conformance run, so every backend answers the conformance operations
with the same data. The products derive from the twenty of the Angular
application's `products.json` (titles, prices, categories), with the
external image links replaced by placeholders before publication and
the prices converted to integer amounts in cents.
