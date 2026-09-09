package nl.zappymart.application.ports

import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.shared.PromotionCode

interface PromotionRepository {

    fun findByCode(code: PromotionCode): Promotion?

    fun save(promotion: Promotion)
}
