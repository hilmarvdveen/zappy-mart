package nl.zappymart.host

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = [
        "spring.datasource.url=jdbc:h2:mem:zappy-mart-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "zappy.security.cookies-secure=false",
    ],
)
@ActiveProfiles("development")
class StoreIntegrationTest {

    @Autowired
    private lateinit var seedReset: ResetSeedController

    @LocalServerPort
    private var port: Int = 0

    private lateinit var store: StoreClient

    @BeforeEach
    fun startFromTheSeed() {
        store = StoreClient(port)
        assertThat(seedReset.resetSeed().loadedProducts).isEqualTo(TWENTY_PRODUCTS)
    }

    @Test
    fun `the catalogue answers in the seed order and pages forward`() {
        val page = store.data(
            "{ products(first: 3) { totalCount pageInfo { hasNextPage endCursor } " +
                "edges { cursor node { id slug price { amount currency } category { slug } } } } }",
            "products",
        )
        assertThat(page.get("totalCount").asInt()).isEqualTo(TWENTY_PRODUCTS)
        val firstThree: List<String> = page.get("edges").values().map { edge -> edge.get("node").get("id").asString() }
        assertThat(firstThree).containsExactly("product-01", "product-02", "product-03")
        assertThat(page.get("pageInfo").get("hasNextPage").asBoolean()).isTrue()

        val nextCursor = page.get("pageInfo").get("endCursor").asString()
        val second = store.data("{ products(first: 2, after: \"$nextCursor\") { edges { node { id } } } }", "products")
        val nextTwo: List<String> = second.get("edges").values().map { edge -> edge.get("node").get("id").asString() }
        assertThat(nextTwo).containsExactly("product-04", "product-05")
    }

    @Test
    fun `the in stock filter leaves out the product with no stock`() {
        val everything = store.data("{ products(first: 1) { totalCount } }", "products")
        val inStock = store.data("{ products(filter: {inStockOnly: true}, first: 1) { totalCount } }", "products")
        assertThat(everything.get("totalCount").asInt()).isEqualTo(TWENTY_PRODUCTS)
        assertThat(inStock.get("totalCount").asInt()).isEqualTo(TWENTY_PRODUCTS - 1)
    }

    @Test
    fun `the four categories come back in the seed order`() {
        assertThat(store.texts("{ categories { slug } }", "categories", "slug"))
            .containsExactly("mens-clothing", "jewellery", "electronics", "womens-clothing")
    }

    @Test
    fun `a product is found by its slug and an unknown slug answers null`() {
        val product = store.data("{ product(slug: \"mens-cotton-jacket\") { id price { amount } stock } }", "product")
        assertThat(product.get("id").asString()).isEqualTo("product-03")
        assertThat(product.get("price").get("amount").asInt()).isEqualTo(5599)
        assertThat(store.ask("{ product(slug: \"nothing-here\") { id } }").get("data").get("product").isNull).isTrue()
    }

    @Test
    fun `an empty cart pays nothing at all`() {
        val cart = store.data(
            "{ cart { lines { id } subtotal { amount } shipping { amount } total { amount } } }",
            "cart",
        )
        assertThat(cart.get("lines")).isEmpty()
        assertThat(cart.get("total").get("amount").asInt()).isZero()
    }

    @Test
    fun `the worked totals of the seed hold over the wire`() {
        val withoutCode = store.data(
            "mutation { addToCart(productId: \"product-18\", quantity: 2) " +
                "{ cart { subtotal { amount } shipping { amount } total { amount } } errors { code } } }",
            "addToCart.cart",
        )
        assertThat(withoutCode.get("subtotal").get("amount").asInt()).isEqualTo(1970)
        assertThat(withoutCode.get("shipping").get("amount").asInt()).isEqualTo(495)
        assertThat(withoutCode.get("total").get("amount").asInt()).isEqualTo(2465)

        val freeShipping = store.data(
            "mutation { applyPromotionCode(code: \"freeship\") " +
                "{ cart { shipping { amount } total { amount } promotion { code kind discount { amount } } } } }",
            "applyPromotionCode.cart",
        )
        assertThat(freeShipping.get("shipping").get("amount").asInt()).isZero()
        assertThat(freeShipping.get("total").get("amount").asInt()).isEqualTo(1970)
        assertThat(freeShipping.get("promotion").get("code").asString()).isEqualTo("FREESHIP")
        assertThat(freeShipping.get("promotion").get("kind").asString()).isEqualTo("FREE_SHIPPING")
        assertThat(freeShipping.get("promotion").get("discount").get("amount").asInt()).isZero()
    }

    @Test
    fun `a percentage code rounds half up and a large cart pays no shipping`() {
        store.data("mutation { addToCart(productId: \"product-03\") { errors { code } } }", "addToCart")
        val cart = store.data(
            "mutation { applyPromotionCode(code: \"WELCOME10\") " +
                "{ cart { subtotal { amount } shipping { amount } total { amount } promotion { discount { amount } } } } }",
            "applyPromotionCode.cart",
        )
        assertThat(cart.get("subtotal").get("amount").asInt()).isEqualTo(5599)
        assertThat(cart.get("shipping").get("amount").asInt()).isZero()
        assertThat(cart.get("promotion").get("discount").get("amount").asInt()).isEqualTo(560)
        assertThat(cart.get("total").get("amount").asInt()).isEqualTo(5039)
    }

    @Test
    fun `every refusal a promotion code can give comes back as a user error`() {
        store.data("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }", "addToCart")
        assertThat(codeOfFirstError("SUMMER2025")).isEqualTo("CODE_EXPIRED")
        assertThat(codeOfFirstError("ONCE")).isEqualTo("CODE_EXHAUSTED")
        assertThat(codeOfFirstError("NOTHINGATALL")).isEqualTo("CODE_UNKNOWN")
        assertThat(codeOfFirstError("FIVEOFF")).isEqualTo("CODE_MINIMUM_NOT_MET")
    }

    @Test
    fun `the product with no stock cannot go into a cart`() {
        val payload = store.data(
            "mutation { addToCart(productId: \"product-07\") { availableStock errors { code message } } }",
            "addToCart",
        )
        assertThat(payload.get("errors").first().get("code").asString()).isEqualTo("OUT_OF_STOCK")
        assertThat(payload.get("availableStock").asInt()).isZero()
    }

    @Test
    fun `the last item can be taken once and no more`() {
        store.data("mutation { addToCart(productId: \"product-12\") { errors { code } } }", "addToCart")
        val second = store.data(
            "mutation { addToCart(productId: \"product-12\") { availableStock errors { code } } }",
            "addToCart",
        )
        assertThat(second.get("errors").first().get("code").asString()).isEqualTo("OUT_OF_STOCK")
        assertThat(second.get("availableStock").asInt()).isEqualTo(1)
    }

    @Test
    fun `a cart line is changed and removed by its own id`() {
        val cart = store.data(
            "mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { lines { id } } } }",
            "addToCart.cart",
        )
        val lineId = cart.get("lines").first().get("id").asString()

        val refusedQuantity = store.data(
            "mutation { changeCartLineQuantity(lineId: \"$lineId\", quantity: 0) { errors { code field } } }",
            "changeCartLineQuantity",
        )
        assertThat(refusedQuantity.get("errors").first().get("code").asString()).isEqualTo("QUANTITY_INVALID")

        val changed = store.data(
            "mutation { changeCartLineQuantity(lineId: \"$lineId\", quantity: 3) " +
                "{ cart { subtotal { amount } } errors { code } } }",
            "changeCartLineQuantity.cart",
        )
        assertThat(changed.get("subtotal").get("amount").asInt()).isEqualTo(2955)

        val emptied = store.data(
            "mutation { removeCartLine(lineId: \"$lineId\") { cart { lines { id } total { amount } } } }",
            "removeCartLine.cart",
        )
        assertThat(emptied.get("lines")).isEmpty()
        assertThat(emptied.get("total").get("amount").asInt()).isZero()

        val gone = store.data(
            "mutation { removeCartLine(lineId: \"$lineId\") { errors { code field } } }",
            "removeCartLine",
        )
        assertThat(gone.get("errors").first().get("code").asString()).isEqualTo("CART_LINE_NOT_FOUND")
    }

    @Test
    fun `the cart cookie is set on the first cart mutation and carries the cart`() {
        assertThat(store.cartCookie()).isNull()
        val first = store.data(
            "mutation { addToCart(productId: \"product-18\") { cart { id } } }",
            "addToCart.cart",
        )
        assertThat(store.cartCookie()).isEqualTo(first.get("id").asString())

        val readBack = store.data("{ cart { id lines { quantity } } }", "cart")
        assertThat(readBack.get("id").asString()).isEqualTo(first.get("id").asString())
        assertThat(readBack.get("lines")).hasSize(1)
    }

    @Test
    fun `a mutation without an allowed origin never reaches the resolver`() {
        val refused = store.withoutOrigin().ask("mutation { addToCart(productId: \"product-18\") { cart { id } } }")
        assertThat(refused.get("data")).isNull()
        assertThat(refused.get("errors").first().get("extensions").get("classification").asString())
            .isEqualTo("FORBIDDEN")

        val foreign = StoreClient(port, "http://evil.example")
            .ask("mutation { addToCart(productId: \"product-18\") { cart { id } } }")
        assertThat(foreign.get("errors").first().get("message").asString()).contains("Origin")
    }

    @Test
    fun `a query without an origin is answered as usual`() {
        val categories = store.withoutOrigin().data("{ categories { slug } }", "categories")
        assertThat(categories).hasSize(4)
    }

    @Test
    fun `the anonymous cart and wishlist move to the customer on login`() {
        store.data("mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { id } } }", "addToCart.cart")
        store.data("mutation { addToWishlist(productId: \"product-03\") { products { id } } }", "addToWishlist")

        store.signsIn("jane@example.com", "correct horse battery staple")

        val customer = store.data("{ me { id email name wishlist { id } } }", "me")
        assertThat(customer.get("email").asString()).isEqualTo("jane@example.com")
        val saved: List<String> = customer.get("wishlist").values().map { product -> product.get("id").asString() }
        assertThat(saved).containsExactly("product-03")
        assertThat(store.data("{ cart { lines { quantity } } }", "cart").get("lines")).hasSize(1)
    }

    @Test
    fun `an order keeps the totals of the moment, empties the cart and reserves the stock`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\", quantity: 2) { cart { id } } }", "addToCart.cart")
        store.data("mutation { applyPromotionCode(code: \"WELCOME10\") { cart { id } } }", "applyPromotionCode.cart")

        val order = store.data(
            "mutation { placeOrder(idempotencyKey: \"a-checkout-attempt\") { order { id number status " +
                "subtotal { amount } discount { amount } shipping { amount } total { amount } promotionCode " +
                "lines { productName quantity unitPrice { amount } lineTotal { amount } } placedAt } " +
                "errors { code } } }",
            "placeOrder.order",
        )
        assertThat(order.get("status").asString()).isEqualTo("PAID")
        assertThat(order.get("subtotal").get("amount").asInt()).isEqualTo(11198)
        assertThat(order.get("discount").get("amount").asInt()).isEqualTo(1120)
        assertThat(order.get("shipping").get("amount").asInt()).isZero()
        assertThat(order.get("total").get("amount").asInt()).isEqualTo(10078)
        assertThat(order.get("promotionCode").asString()).isEqualTo("WELCOME10")
        assertThat(order.get("placedAt").asString()).endsWith("Z")
        assertThat(order.get("lines").first().get("productName").asString()).isEqualTo("Mens Cotton Jacket")

        assertThat(store.data("{ cart { lines { id } } }", "cart").get("lines")).isEmpty()
        assertThat(store.data("{ product(slug: \"mens-cotton-jacket\") { stock } }", "product").get("stock").asInt())
            .isEqualTo(6)

        val orderId = order.get("id").asString()
        val readBack = store.data("{ order(id: \"$orderId\") { number total { amount } } }", "order")
        assertThat(readBack.get("total").get("amount").asInt()).isEqualTo(10078)

        val history = store.data("{ orders(first: 5) { totalCount edges { node { id } } } }", "orders")
        assertThat(history.get("totalCount").asInt()).isEqualTo(1)
    }

    @Test
    fun `a second checkout of the emptied cart is refused`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        store.data("mutation { placeOrder { order { id } } }", "placeOrder")

        val refused = store.data("mutation { placeOrder { order { id } errors { code } } }", "placeOrder")
        assertThat(refused.get("order").isNull).isTrue()
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("CART_EMPTY")
    }

    @Test
    fun `checking out without a customer is refused`() {
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        val refused = store.data("mutation { placeOrder { errors { code } } }", "placeOrder")
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("NOT_AUTHENTICATED")
    }

    @Test
    fun `an order of another customer is not readable`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        val orderId = store.data("mutation { placeOrder { order { id } } }", "placeOrder.order").get("id").asString()

        val somebodyElse = StoreClient(port)
        somebodyElse.data(
            """mutation { register(input: {email: "someone@example.com", name: "Someone", """ +
                """password: "a long enough password"}) { customer { id } } }""",
            "register",
        )
        somebodyElse.signsIn("someone@example.com", "a long enough password")
        assertThat(somebodyElse.ask("{ order(id: \"$orderId\") { id } }").get("data").get("order").isNull).isTrue()
    }

    @Test
    fun `registering refuses a taken address and a password that is too short`() {
        val taken = store.data(
            """mutation { register(input: {email: "jane@example.com", name: "Jane", """ +
                """password: "a long enough password"}) { errors { code field } } }""",
            "register",
        )
        assertThat(taken.get("errors").first().get("code").asString()).isEqualTo("EMAIL_TAKEN")

        val tooShort = store.data(
            """mutation { register(input: {email: "another@example.com", name: "Another", """ +
                """password: "short"}) { errors { code field } } }""",
            "register",
        )
        assertThat(tooShort.get("errors").first().get("code").asString()).isEqualTo("PASSWORD_TOO_SHORT")
        assertThat(tooShort.get("errors").first().get("field").asString()).isEqualTo("input.password")
    }

    @Test
    fun `a wrong password answers one code`() {
        val refused = store.data(
            """mutation { login(input: {email: "jane@example.com", password: "not the password"}) """ +
                """{ customer { id } errors { code } } }""",
            "login",
        )
        assertThat(refused.get("customer").isNull).isTrue()
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("CREDENTIALS_INVALID")
    }

    @Test
    fun `a refresh token is used once and a replay ends the session`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        val firstToken = requireNotNull(store.refreshTokenCookie())

        val refreshed = store.data("mutation { refreshSession { accessToken errors { code } } }", "refreshSession")
        assertThat(refreshed.get("accessToken").asString()).isNotBlank()
        assertThat(store.refreshTokenCookie()).isNotEqualTo(firstToken)

        val replay = StoreClient(port)
        replay.ask("mutation { refreshSession { errors { code } } }")
        assertThat(
            store.data("mutation { refreshSession { errors { code } } }", "refreshSession").get("errors"),
        ).isEmpty()
    }

    @Test
    fun `logging out ends the session at once, even while the access token still looks valid`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        assertThat(store.data("{ me { id } }", "me").get("id").asString()).isEqualTo("customer-01")

        val loggedOut = store.data("mutation { logout { success errors { code } } }", "logout")
        assertThat(loggedOut.get("success").asBoolean()).isTrue()
        assertThat(store.ask("{ me { id } }").get("data").get("me").isNull).isTrue()

        assertThat(
            store.data("mutation { logout { success } }", "logout").get("success").asBoolean(),
        ).isTrue()
    }

    @Test
    fun `a customer sees the sessions of every device and can revoke one`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        val otherDevice = StoreClient(port)
        otherDevice.signsIn("jane@example.com", "correct horse battery staple")

        val sessions = store.data("{ me { sessions { id current device } } }", "me.sessions")
        assertThat(sessions).hasSize(2)
        assertThat(sessions.count { session -> session.get("current").asBoolean() }).isEqualTo(1)

        val other = sessions.first { session -> !session.get("current").asBoolean() }.get("id").asString()
        val left = store.data(
            "mutation { revokeSession(sessionId: \"$other\") { sessions { id } errors { code } } }",
            "revokeSession",
        )
        assertThat(left.get("sessions")).hasSize(1)
        assertThat(otherDevice.ask("{ me { id } }").get("data").get("me").isNull).isTrue()
    }

    @Test
    fun `revoking somebody else's session is refused`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        val refused = store.data(
            "mutation { revokeSession(sessionId: \"a-session-of-somebody-else\") { errors { code } } }",
            "revokeSession",
        )
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("SESSION_NOT_FOUND")
    }

    @Test
    fun `a wishlist works for a visitor who never signs in`() {
        val saved = store.data(
            "mutation { addToWishlist(productId: \"product-03\") { products { id } errors { code } } }",
            "addToWishlist",
        )
        assertThat(saved.get("errors")).isEmpty()
        assertThat(store.data("{ wishlist { id } }", "wishlist")).hasSize(1)

        val removed = store.data(
            "mutation { removeFromWishlist(productId: \"product-03\") { products { id } errors { code } } }",
            "removeFromWishlist",
        )
        assertThat(removed.get("products")).isEmpty()

        val unknown = store.data(
            "mutation { addToWishlist(productId: \"product-99\") { errors { code field } } }",
            "addToWishlist",
        )
        assertThat(unknown.get("errors").first().get("code").asString()).isEqualTo("PRODUCT_NOT_FOUND")
    }

    @Test
    fun `resetting the seed puts every product and every code back`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        store.data("mutation { placeOrder { order { id } } }", "placeOrder.order")

        val reset = store.data(
            "mutation { resetSeed { success loadedProducts errors { code } } }",
            "resetSeed",
        )
        assertThat(reset.get("success").asBoolean()).isTrue()
        assertThat(reset.get("loadedProducts").asInt()).isEqualTo(TWENTY_PRODUCTS)
        assertThat(store.data("{ product(slug: \"mens-cotton-jacket\") { stock } }", "product").get("stock").asInt())
            .isEqualTo(8)
    }

    private fun codeOfFirstError(promotionCode: String): String = store.data(
        "mutation { applyPromotionCode(code: \"$promotionCode\") { errors { code } } }",
        "applyPromotionCode",
    ).get("errors").first().get("code").asString()

    private companion object {
        const val TWENTY_PRODUCTS = 20
    }
}
