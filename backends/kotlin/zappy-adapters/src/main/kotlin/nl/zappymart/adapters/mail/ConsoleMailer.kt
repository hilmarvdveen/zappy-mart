package nl.zappymart.adapters.mail

import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderConfirmation
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class ConsoleMailer : Mailer {

    private val log = LoggerFactory.getLogger(ConsoleMailer::class.java)

    override fun send(confirmation: OrderConfirmation) {
        log.info(
            "Order confirmation for order {} to {}, total {} {}",
            confirmation.orderNumber,
            confirmation.recipient.value,
            confirmation.total.amount,
            confirmation.total.currency,
        )
    }
}
