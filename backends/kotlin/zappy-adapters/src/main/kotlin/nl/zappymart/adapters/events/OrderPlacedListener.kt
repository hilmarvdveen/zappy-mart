package nl.zappymart.adapters.events

import nl.zappymart.application.ordering.SendOrderConfirmation
import nl.zappymart.application.promotions.CountPromotionUse
import nl.zappymart.domain.ordering.OrderPlaced
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

@Component
class OrderPlacedListener(
    private val countPromotionUse: CountPromotionUse,
    private val sendOrderConfirmation: SendOrderConfirmation,
) {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun onOrderPlaced(event: OrderPlaced) {
        countPromotionUse.handle(event)
        sendOrderConfirmation.handle(event)
    }
}
