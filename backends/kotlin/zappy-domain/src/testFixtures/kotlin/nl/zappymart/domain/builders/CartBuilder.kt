package nl.zappymart.domain.builders

import java.time.Instant
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.cart.CartLine
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.promotions.AppliedPromotion
import nl.zappymart.domain.promotions.PromotionKind
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode

val A_MOMENT: Instant = Instant.parse("2026-09-09T10:00:00Z")

class CartBuilder {

    private val lines = mutableListOf<CartLine>()
    private var customerId: String? = null
    private var promotion: AppliedPromotion? = null

    fun holding(product: Product, quantity: Int = 1) = apply {
        lines.add(CartLine("line-${lines.size + 1}", product, quantity))
    }

    fun ownedBy(customerId: String) = apply { this.customerId = customerId }

    fun withPercentageOff(code: String, discountInCents: Int) = apply {
        promotion = AppliedPromotion(PromotionCode.of(code), PromotionKind.PERCENTAGE, Money.euro(discountInCents))
    }

    fun withFreeShipping(code: String) = apply {
        promotion = AppliedPromotion(PromotionCode.of(code), PromotionKind.FREE_SHIPPING, Money.NOTHING)
    }

    fun build() = Cart("cart-01", customerId, lines.toList(), promotion?.code, promotion, A_MOMENT)
}

fun aCart() = CartBuilder()
