package nl.zappymart.domain.promotions

import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode

data class AppliedPromotion(
    val code: PromotionCode,
    val kind: PromotionKind,
    val discount: Money,
) {
    val takesShippingAway: Boolean get() = kind == PromotionKind.FREE_SHIPPING
}
