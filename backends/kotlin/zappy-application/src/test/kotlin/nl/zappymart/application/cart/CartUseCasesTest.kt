package nl.zappymart.application.cart

import java.time.Instant
import nl.zappymart.application.AllowingRateLimiter
import nl.zappymart.application.CountingIdentifierFactory
import nl.zappymart.application.DirectUnitOfWork
import nl.zappymart.application.FixedClock
import nl.zappymart.application.InMemoryCarts
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.application.InMemoryPromotions
import nl.zappymart.application.Visitor
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CartUseCasesTest {

    private val boatNeck = aProduct().withId("product-18").named("Boat neck").costing(985).withStock(25).build()

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    private val clock = FixedClock()

    private val carts = InMemoryCarts()

    private val products = InMemoryProducts(listOf(boatNeck, jacket))

    private val promotions = InMemoryPromotions(
        listOf(
            Promotion(
                PromotionCode.of("WELCOME10"),
                PromotionRule.Percentage(10),
                null,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2027-12-31T23:59:59Z"),
                null,
                0,
            ),
            Promotion(
                PromotionCode.of("FIVEOFF"),
                PromotionRule.FixedAmount(Money.euro(500)),
                Money.euro(2500),
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2027-12-31T23:59:59Z"),
                null,
                0,
            ),
        ),
    )

    private val identifiers = CountingIdentifierFactory()

    private val unitOfWork = DirectUnitOfWork()

    private val cartPromotion = CartPromotion(promotions, clock)

    private val visitorCart = VisitorCart(carts, clock, identifiers)

    private val addToCart = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    private val applyPromotionCode = ApplyPromotionCode(visitorCart, cartPromotion, carts, unitOfWork)

    private val removeCartLine = RemoveCartLine(visitorCart, cartPromotion, carts, clock, unitOfWork)

    private val viewCart = ViewCart(visitorCart, cartPromotion)

    private val rateLimiter = AllowingRateLimiter()

    @Test
    fun `a visitor without a cart gets an empty one`() {
        val cart = viewCart.execute(Visitor.ANONYMOUS)
        assertThat(cart.lines).isEmpty()
        assertThat(cart.total).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `adding a product the store does not sell is refused`() {
        val change = addToCart.execute(Visitor.ANONYMOUS, "product-99", 1)
        assertThat(change.errors.map { error -> error.code }).containsExactly(UserErrorCode.PRODUCT_NOT_FOUND)
    }

    @Test
    fun `adding above the stock answers how many are available`() {
        val change = addToCart.execute(Visitor.ANONYMOUS, "product-03", 9)
        assertThat(change.errors.map { error -> error.code }).containsExactly(UserErrorCode.OUT_OF_STOCK)
        assertThat(change.availableStock).isEqualTo(8)
    }

    @Test
    fun `a promotion code follows the cart when a line changes`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        val applied = applyPromotionCode.execute(visitor, "welcome10")
        assertThat(applied.cart.discount).isEqualTo(Money.euro(560))

        val grown = addToCart.execute(visitor, "product-03", 1)
        assertThat(grown.cart.subtotal).isEqualTo(Money.euro(11198))
        assertThat(grown.cart.discount).isEqualTo(Money.euro(1120))
        assertThat(grown.cart.total).isEqualTo(Money.euro(10078))
    }

    @Test
    fun `a code that no longer holds leaves the cart when the cart shrinks`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-18", 3)
        val visitor = Visitor(null, null, started.cart.id)
        assertThat(applyPromotionCode.execute(visitor, "FIVEOFF").errors).isEmpty()

        val lineId = started.cart.lines.first().id
        val emptied = removeCartLine.execute(visitor, lineId)
        assertThat(emptied.cart.promotion).isNull()
        assertThat(emptied.cart.promotionCode).isNull()
        assertThat(emptied.cart.total).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `applying a second code replaces the first`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        applyPromotionCode.execute(visitor, "WELCOME10")
        val replaced = applyPromotionCode.execute(visitor, "FIVEOFF")
        assertThat(replaced.cart.promotion?.code?.value).isEqualTo("FIVEOFF")
        assertThat(replaced.cart.discount).isEqualTo(Money.euro(500))
    }

    @Test
    fun `an unknown code leaves the cart as it was`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        applyPromotionCode.execute(visitor, "WELCOME10")
        val refused = applyPromotionCode.execute(visitor, "NOSUCHCODE")
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_UNKNOWN)
        assertThat(refused.cart.promotion?.code?.value).isEqualTo("WELCOME10")
    }

    @Test
    fun `an anonymous cart moves to the customer on sign in`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-18", 2)
        val visitor = Visitor(null, null, started.cart.id)
        val moved = visitorCart.moveToCustomer(visitor, "customer-01")
        assertThat(moved.customerId).isEqualTo("customer-01")
        assertThat(moved.lines).hasSize(1)
        assertThat(carts.findByCustomerId("customer-01")?.subtotal).isEqualTo(Money.euro(1970))
        assertThat(rateLimiter.allows("anything")).isTrue()
    }

    @Test
    fun `two carts merge into one on sign in`() {
        val customerVisitor = Visitor("customer-01", "session-01", null)
        addToCart.execute(customerVisitor, "product-03", 1)
        val anonymous = addToCart.execute(Visitor.ANONYMOUS, "product-18", 2)

        val merged = visitorCart.moveToCustomer(Visitor(null, null, anonymous.cart.id), "customer-01")
        assertThat(merged.lines.map { line -> line.product.id }).containsExactlyInAnyOrder("product-03", "product-18")
        assertThat(carts.findById(anonymous.cart.id)).isNull()
    }
}
