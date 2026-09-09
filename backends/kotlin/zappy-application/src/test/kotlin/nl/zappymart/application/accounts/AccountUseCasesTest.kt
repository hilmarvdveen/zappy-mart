package nl.zappymart.application.accounts

import java.time.Instant
import nl.zappymart.application.AllowingRateLimiter
import nl.zappymart.application.CountingIdentifierFactory
import nl.zappymart.application.DirectUnitOfWork
import nl.zappymart.application.FixedClock
import nl.zappymart.application.InMemoryCarts
import nl.zappymart.application.InMemoryCustomers
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.application.InMemoryPromotions
import nl.zappymart.application.InMemorySessions
import nl.zappymart.application.InMemoryWishlists
import nl.zappymart.application.PredictableAccessTokenIssuer
import nl.zappymart.application.PredictableRefreshTokenIssuer
import nl.zappymart.application.ReversingPasswordHasher
import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AccountUseCasesTest {

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    private val clock = FixedClock()

    private val passwords = ReversingPasswordHasher()

    private val jane = Customer(
        "customer-01",
        EmailAddress.ofStored("jane@example.com"),
        "Jane Doe",
        passwords.hash("correct horse battery staple"),
        Instant.parse("2026-01-15T09:00:00Z"),
    )

    private val customers = InMemoryCustomers(listOf(jane))

    private val sessions = InMemorySessions()

    private val carts = InMemoryCarts()

    private val wishlists = InMemoryWishlists()

    private val products = InMemoryProducts(listOf(jacket))

    private val identifiers = CountingIdentifierFactory()

    private val unitOfWork = DirectUnitOfWork()

    private val accessTokens = PredictableAccessTokenIssuer()

    private val refreshTokens = PredictableRefreshTokenIssuer()

    private val rateLimiter = AllowingRateLimiter()

    private val visitorCart = VisitorCart(carts, clock, identifiers)

    private val cartPromotion = CartPromotion(InMemoryPromotions(), clock)

    private val addToCart = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    private val wishlistOwner = WishlistOwner(wishlists, visitorCart, carts)

    private val viewWishlist = ViewWishlist(wishlists, products, wishlistOwner)

    private val addToWishlist = AddToWishlist(wishlists, products, viewWishlist, wishlistOwner, unitOfWork)

    private val removeFromWishlist = RemoveFromWishlist(wishlists, viewWishlist, wishlistOwner, unitOfWork)

    private val signIn = SignIn(sessions, accessTokens, refreshTokens, identifiers, clock)

    private val logInCustomer =
        LogInCustomer(customers, passwords, signIn, visitorCart, wishlistOwner, rateLimiter, unitOfWork)

    private val registerCustomer = RegisterCustomer(
        customers,
        passwords,
        identifiers,
        clock,
        signIn,
        visitorCart,
        wishlistOwner,
        rateLimiter,
        unitOfWork,
    )

    private val refreshSession =
        RefreshSession(sessions, customers, accessTokens, refreshTokens, clock, unitOfWork)

    private val logOut = LogOut(sessions, refreshTokens, clock, unitOfWork)

    private val revokeSession = RevokeSession(sessions, clock, unitOfWork)

    private val identifyVisitor = IdentifyVisitor(accessTokens, sessions, clock)

    @Test
    fun `a login with the seed password opens a session`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("JANE@Example.com", "correct horse battery staple", "Chrome on Windows"),
        ) as Result.Success
        assertThat(signedIn.value.customer.id).isEqualTo("customer-01")
        assertThat(sessions.findById(signedIn.value.sessionId)?.device).isEqualTo("Chrome on Windows")
    }

    @Test
    fun `a wrong password answers one code and never says whether the address exists`() {
        val wrongPassword = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "not the right password", "Chrome"),
        ) as Result.Refused
        val unknownAddress = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("nobody@example.com", "not the right password", "Chrome"),
        ) as Result.Refused
        assertThat(wrongPassword.errors).isEqualTo(unknownAddress.errors)
        assertThat(wrongPassword.errors.map { error -> error.code })
            .containsExactly(UserErrorCode.CREDENTIALS_INVALID)
    }

    @Test
    fun `too many attempts are rate limited`() {
        rateLimiter.refusesEverything()
        val refused = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.RATE_LIMITED)
    }

    @Test
    fun `registering with a taken address is refused`() {
        val refused = registerCustomer.execute(
            Visitor.ANONYMOUS,
            RegistrationRequest("jane@example.com", "Jane", "a long enough password", "Chrome"),
        ) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.EMAIL_TAKEN)
    }

    @Test
    fun `registering signs the new customer in and takes the cart along`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        val registered = registerCustomer.execute(
            visitor,
            RegistrationRequest("  NEW@Example.com ", "New Customer", "a long enough password", "Chrome"),
        ) as Result.Success
        assertThat(registered.value.customer.email.value).isEqualTo("new@example.com")
        assertThat(carts.findByCustomerId(registered.value.customer.id)?.lines).hasSize(1)
    }

    @Test
    fun `a refresh token is used once and a replay revokes the session`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val firstToken = signedIn.value.refreshToken

        val refreshed = refreshSession.execute(firstToken) as Result.Success
        assertThat(refreshed.value.refreshToken).isNotEqualTo(firstToken)

        val replayed = refreshSession.execute(firstToken) as Result.Refused
        assertThat(replayed.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_INVALID)

        val afterTheReplay = refreshSession.execute(refreshed.value.refreshToken) as Result.Refused
        assertThat(afterTheReplay.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_INVALID)
    }

    @Test
    fun `a refresh without a token is refused`() {
        val refused = refreshSession.execute(null) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_INVALID)
    }

    @Test
    fun `a logged out session is refused on the next bearer request`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val bearer = signedIn.value.accessToken.value
        assertThat(identifyVisitor.execute(bearer, null).customerId).isEqualTo("customer-01")

        logOut.execute(Visitor("customer-01", signedIn.value.sessionId, null), signedIn.value.refreshToken)
        assertThat(identifyVisitor.execute(bearer, null).customerId).isNull()
    }

    @Test
    fun `logging out twice answers the same`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val visitor = Visitor("customer-01", signedIn.value.sessionId, null)
        assertThat(logOut.execute(visitor, signedIn.value.refreshToken)).isTrue()
        assertThat(logOut.execute(visitor, signedIn.value.refreshToken)).isTrue()
    }

    @Test
    fun `revoking a session that belongs to somebody else is refused`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val refused = revokeSession.execute(
            Visitor("customer-01", signedIn.value.sessionId, null),
            "a-session-of-somebody-else",
        ) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_NOT_FOUND)
    }

    @Test
    fun `an anonymous wishlist lives against the cart cookie and merges on login`() {
        val saved = addToWishlist.execute(Visitor.ANONYMOUS, "product-03")
        assertThat(saved.errors).isEmpty()
        assertThat(saved.products.map { product -> product.id }).containsExactly("product-03")
        val anonymousCartId = requireNotNull(saved.anonymousCartId)

        val visitor = Visitor(null, null, anonymousCartId)
        assertThat(viewWishlist.execute(visitor).map { product -> product.id }).containsExactly("product-03")

        logInCustomer.execute(visitor, LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"))
        val asCustomer = Visitor("customer-01", "session-01", anonymousCartId)
        assertThat(viewWishlist.execute(asCustomer).map { product -> product.id }).containsExactly("product-03")
    }

    @Test
    fun `saving an unknown product to a wishlist is refused`() {
        val refused = addToWishlist.execute(Visitor.ANONYMOUS, "product-99")
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.PRODUCT_NOT_FOUND)
    }

    @Test
    fun `removing a product that is not on the wishlist is not an error`() {
        val change = removeFromWishlist.execute(Visitor.ANONYMOUS, "product-03")
        assertThat(change.errors).isEmpty()
        assertThat(change.products).isEmpty()
    }

    @Test
    fun `an unknown bearer token leaves the visitor anonymous`() {
        assertThat(identifyVisitor.execute("not-a-token", "cart-01"))
            .isEqualTo(Visitor(null, null, "cart-01"))
        assertThat(FindSignedInCustomer(customers).execute(Visitor.ANONYMOUS)).isNull()
        assertThat(ListSessions(sessions, clock).execute("customer-01")).isEmpty()
    }
}
