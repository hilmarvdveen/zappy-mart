package nl.zappymart.application.cart

import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.map
import nl.zappymart.domain.shared.refusal

class CartPromotion(
    private val promotions: PromotionRepository,
    private val clock: Clock,
) {

    fun refreshed(cart: Cart): Cart {
        val code = cart.promotionCode ?: return cart
        val promotion = promotions.findByCode(code) ?: return cart.withoutPromotion(cart.updatedAt)
        return when (val applied = promotion.applyTo(cart.subtotal, clock.moment())) {
            is Result.Success -> cart.withPromotion(applied.value, cart.updatedAt)
            is Result.Refused -> cart.withoutPromotion(cart.updatedAt)
        }
    }

    fun applying(cart: Cart, text: String): Result<Cart> {
        val code = PromotionCode.of(text)
        val promotion = promotions.findByCode(code)
            ?: return refusal(UserErrorCode.CODE_UNKNOWN, "There is no promotion code ${code.value}.", "code")
        val moment = clock.moment()
        return promotion.applyTo(cart.subtotal, moment).map { applied -> cart.withPromotion(applied, moment) }
    }
}
