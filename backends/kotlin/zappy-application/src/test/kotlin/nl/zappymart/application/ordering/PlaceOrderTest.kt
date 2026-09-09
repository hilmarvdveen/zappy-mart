package nl.zappymart.application.ordering

import java.time.Instant
import nl.zappymart.application.CountingIdentifierFactory
import nl.zappymart.application.DirectUnitOfWork
import nl.zappymart.application.FixedClock
import nl.zappymart.application.FixedOrderNumberFactory
import nl.zappymart.application.InMemoryCarts
import nl.zappymart.application.InMemoryCustomers
import nl.zappymart.application.InMemoryOrders
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.application.InMemoryPromotions
import nl.zappymart.application.RecordingEventPublisher
import nl.zappymart.application.RecordingMailer
import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.ApplyPromotionCode
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.ViewCart
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.promotions.CountPromotionUse
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class PlaceOrderTest {

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    private val clock = FixedClock()

    private val carts = InMemoryCarts()

    private val products = InMemoryProducts(listOf(jacket))

    private val orders = InMemoryOrders()

    private val customers = InMemoryCustomers(
        listOf(
            Customer(
                "customer-01",
                EmailAddress.ofStored("jane@example.com"),
                "Jane Doe",
                PasswordHash("hash"),
                Instant.parse("2026-01-15T09:00:00Z"),
            ),
        ),
    )

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
        ),
    )

    private val identifiers = CountingIdentifierFactory()

    private val unitOfWork = DirectUnitOfWork()

    private val events = RecordingEventPublisher()

    private val mailer = RecordingMailer()

    private val cartPromotion = CartPromotion(promotions, clock)

    private val visitorCart = VisitorCart(carts, clock, identifiers)

    private val addToCart = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    private val applyPromotionCode = ApplyPromotionCode(visitorCart, cartPromotion, carts, unitOfWork)

    private val viewCart = ViewCart(visitorCart, cartPromotion)

    private val placeOrder = PlaceOrder(
        visitorCart,
        cartPromotion,
        carts,
        products,
        orders,
        identifiers,
        FixedOrderNumberFactory(),
        clock,
        unitOfWork,
        events,
    )

    private val signedIn = Visitor("customer-01", "session-01", null)

    @Test
    fun `a visitor who is not signed in cannot order`() {
        val refused = placeOrder.execute(Visitor.ANONYMOUS) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.NOT_AUTHENTICATED)
    }

    @Test
    fun `an empty cart cannot be ordered`() {
        val refused = placeOrder.execute(signedIn) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_EMPTY)
    }

    @Test
    fun `placing an order empties the cart, reserves the stock and announces itself`() {
        addToCart.execute(signedIn, "product-03", 2)
        applyPromotionCode.execute(signedIn, "WELCOME10")

        val placed = placeOrder.execute(signedIn) as Result.Success
        assertThat(placed.value.total).isEqualTo(Money.euro(10078))
        assertThat(viewCart.execute(signedIn).lines).isEmpty()
        assertThat(products.findById("product-03")?.stock).isEqualTo(6)
        assertThat(events.published).hasSize(1)
    }

    @Test
    fun `a second order from the emptied cart is refused`() {
        addToCart.execute(signedIn, "product-03", 1)
        placeOrder.execute(signedIn)
        val refused = placeOrder.execute(signedIn) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_EMPTY)
    }

    @Test
    fun `the placed event counts the code and sends the confirmation`() {
        addToCart.execute(signedIn, "product-03", 1)
        applyPromotionCode.execute(signedIn, "WELCOME10")
        val placed = placeOrder.execute(signedIn) as Result.Success

        CountPromotionUse(promotions).handle(placed.value.placed())
        SendOrderConfirmation(customers, orders, mailer).handle(placed.value.placed())

        assertThat(promotions.findByCode(PromotionCode.of("WELCOME10"))?.timesUsed).isEqualTo(1)
        assertThat(mailer.sent).singleElement().satisfies({ confirmation ->
            assertThat(confirmation.recipient.value).isEqualTo("jane@example.com")
            assertThat(confirmation.orderNumber).isEqualTo("ZM-TEST-1")
        })
    }

    @Test
    fun `the order history is newest first and pages`() {
        addToCart.execute(signedIn, "product-03", 1)
        placeOrder.execute(signedIn)
        addToCart.execute(signedIn, "product-03", 1)
        placeOrder.execute(signedIn)

        val listOrders = ListOrders(orders)
        val firstPage = listOrders.execute(signedIn, 1, null)
        assertThat(firstPage.totalCount).isEqualTo(2)
        assertThat(firstPage.hasNextPage).isTrue()

        val secondPage = listOrders.execute(signedIn, 1, firstPage.items.first().id)
        assertThat(secondPage.items).hasSize(1)
        assertThat(secondPage.hasNextPage).isFalse()
        assertThat(FindOrder(orders).execute(signedIn, secondPage.items.first().id)).isNotNull()
        assertThat(FindOrder(orders).execute(Visitor.ANONYMOUS, secondPage.items.first().id)).isNull()
    }
}
