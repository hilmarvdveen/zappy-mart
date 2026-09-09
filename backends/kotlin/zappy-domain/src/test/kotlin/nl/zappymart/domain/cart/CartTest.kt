package nl.zappymart.domain.cart

import nl.zappymart.domain.builders.A_MOMENT
import nl.zappymart.domain.builders.aCart
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CartTest {

    private val boatNeck = aProduct().withId("product-18").named("Boat neck").costing(985).withStock(25).build()

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    @Test
    fun `an empty cart pays nothing at all`() {
        val cart = aCart().build()
        assertThat(cart.subtotal).isEqualTo(Money.NOTHING)
        assertThat(cart.shipping).isEqualTo(Money.NOTHING)
        assertThat(cart.total).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `a cart below five thousand cents pays the shipping charge`() {
        val cart = aCart().holding(boatNeck, 2).build()
        assertThat(cart.subtotal).isEqualTo(Money.euro(1970))
        assertThat(cart.shipping).isEqualTo(Money.euro(495))
        assertThat(cart.total).isEqualTo(Money.euro(2465))
    }

    @Test
    fun `a free shipping code takes the charge away and discounts nothing`() {
        val cart = aCart().holding(boatNeck, 2).withFreeShipping("FREESHIP").build()
        assertThat(cart.shipping).isEqualTo(Money.NOTHING)
        assertThat(cart.discount).isEqualTo(Money.NOTHING)
        assertThat(cart.total).isEqualTo(Money.euro(1970))
    }

    @Test
    fun `a cart of five thousand cents or more pays no shipping`() {
        val cart = aCart().holding(jacket).withPercentageOff("WELCOME10", 560).build()
        assertThat(cart.subtotal).isEqualTo(Money.euro(5599))
        assertThat(cart.shipping).isEqualTo(Money.NOTHING)
        assertThat(cart.discount).isEqualTo(Money.euro(560))
        assertThat(cart.total).isEqualTo(Money.euro(5039))
    }

    @Test
    fun `adding a product that is already on a line raises the quantity`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val changed = cart.withProductAdded(boatNeck, 3, "line-new", A_MOMENT) as Result.Success
        assertThat(changed.value.lines).hasSize(1)
        assertThat(changed.value.lines.first().quantity).isEqualTo(5)
    }

    @Test
    fun `adding more than the stock is refused with the product named`() {
        val lastOne = aProduct().withId("product-12").named("Gaming drive").costing(11400).withStock(1).build()
        val cart = aCart().holding(lastOne).build()
        val refused = cart.withProductAdded(lastOne, 1, "line-new", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.OUT_OF_STOCK)
        assertThat(refused.errors.first().message).contains("Gaming drive")
    }

    @Test
    fun `a quantity below one is refused`() {
        val cart = aCart().build()
        val refused = cart.withProductAdded(boatNeck, 0, "line-new", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.QUANTITY_INVALID)
    }

    @Test
    fun `changing a quantity to zero is refused rather than removing the line`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val refused = cart.withLineQuantityChanged("line-1", 0, A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.QUANTITY_INVALID)
    }

    @Test
    fun `changing a line that is not in the cart is refused`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val refused = cart.withLineQuantityChanged("line-nine", 1, A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_LINE_NOT_FOUND)
    }

    @Test
    fun `removing a line that is already gone is refused`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val emptied = (cart.withLineRemoved("line-1", A_MOMENT) as Result.Success).value
        val refused = emptied.withLineRemoved("line-1", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_LINE_NOT_FOUND)
    }

    @Test
    fun `emptying a cart drops its lines and its promotion code`() {
        val cart = aCart().holding(boatNeck, 2).withPercentageOff("WELCOME10", 197).build()
        val emptied = cart.emptied(A_MOMENT)
        assertThat(emptied.lines).isEmpty()
        assertThat(emptied.promotionCode).isNull()
        assertThat(emptied.promotion).isNull()
    }
}
