package nl.zappymart.domain.ordering

import nl.zappymart.domain.builders.A_MOMENT
import nl.zappymart.domain.builders.aCart
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class OrderTest {

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    @Test
    fun `an order keeps the names, the prices and the totals of the moment`() {
        val cart = aCart().holding(jacket, 2).withPercentageOff("WELCOME10", 1120).build()
        val placed = Order.place(cart, "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Success
        val order = placed.value
        assertThat(order.status).isEqualTo(OrderStatus.PAID)
        assertThat(order.lines).singleElement().satisfies({ line ->
            assertThat(line.productName).isEqualTo("Cotton jacket")
            assertThat(line.unitPrice).isEqualTo(Money.euro(5599))
            assertThat(line.lineTotal).isEqualTo(Money.euro(11198))
        })
        assertThat(order.subtotal).isEqualTo(Money.euro(11198))
        assertThat(order.discount).isEqualTo(Money.euro(1120))
        assertThat(order.shipping).isEqualTo(Money.NOTHING)
        assertThat(order.total).isEqualTo(Money.euro(10078))
        assertThat(order.promotionCode?.value).isEqualTo("WELCOME10")
    }

    @Test
    fun `an empty cart cannot be ordered`() {
        val refused = Order.place(aCart().build(), "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_EMPTY)
    }

    @Test
    fun `a line above the stock stops the whole order and names the product`() {
        val lastOne = aProduct().withId("product-12").named("Gaming drive").withStock(1).build()
        val cart = aCart().holding(jacket).holding(lastOne, 2).build()
        val refused = Order.place(cart, "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.OUT_OF_STOCK)
        assertThat(refused.errors.first().message).contains("Gaming drive")
    }

    @Test
    fun `a placed order announces itself`() {
        val cart = aCart().holding(jacket).build()
        val order = (Order.place(cart, "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Success).value
        assertThat(order.placed()).isEqualTo(OrderPlaced("order-01", "ZM-1", "customer-01", null, A_MOMENT))
    }
}
