package nl.zappymart.application.promotions

import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.domain.ordering.OrderPlaced

class CountPromotionUse(private val promotions: PromotionRepository) {

    fun handle(event: OrderPlaced) {
        val code = event.promotionCode ?: return
        val promotion = promotions.findByCode(code) ?: return
        promotions.save(promotion.usedOnce())
    }
}
