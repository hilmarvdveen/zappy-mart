package nl.zappymart.domain.cart

import nl.zappymart.domain.promotions.AppliedPromotion
import nl.zappymart.domain.shared.Money

object Shipping {

    val CHARGE = Money.euro(495)

    val FREE_FROM_SUBTOTAL = Money.euro(5000)

    fun forSubtotal(subtotal: Money, promotion: AppliedPromotion?, cartHasLines: Boolean): Money = when {
        !cartHasLines -> Money.NOTHING
        promotion != null && promotion.takesShippingAway -> Money.NOTHING
        subtotal >= FREE_FROM_SUBTOTAL -> Money.NOTHING
        else -> CHARGE
    }
}
