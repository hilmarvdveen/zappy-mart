package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.PromotionCode
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaPromotionRepository(private val promotions: PromotionEntities) : PromotionRepository {

    override fun findByCode(code: PromotionCode): Promotion? =
        promotions.findById(code.value).orElse(null)?.asPromotion()

    @Transactional
    override fun save(promotion: Promotion) {
        val entity = promotions.findById(promotion.code.value).orElseGet {
            PromotionEntity(code = promotion.code.value)
        }
        entity.kind = promotion.rule.kind.name
        entity.percentage = (promotion.rule as? PromotionRule.Percentage)?.percentage
        entity.amount = (promotion.rule as? PromotionRule.FixedAmount)?.amount?.amount
        entity.minimumSubtotal = promotion.minimumSubtotal?.amount
        entity.validFrom = promotion.validFrom
        entity.validUntil = promotion.validUntil
        entity.usageLimit = promotion.usageLimit
        entity.timesUsed = promotion.timesUsed
        promotions.save(entity)
    }
}
