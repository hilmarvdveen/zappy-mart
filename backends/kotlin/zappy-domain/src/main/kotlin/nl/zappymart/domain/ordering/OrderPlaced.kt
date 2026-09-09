package nl.zappymart.domain.ordering

import java.time.Instant
import nl.zappymart.domain.shared.DomainEvent
import nl.zappymart.domain.shared.PromotionCode

data class OrderPlaced(
    val orderId: String,
    val orderNumber: String,
    val customerId: String,
    val promotionCode: PromotionCode?,
    val placedAt: Instant,
) : DomainEvent
