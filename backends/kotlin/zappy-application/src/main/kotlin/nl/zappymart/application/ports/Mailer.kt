package nl.zappymart.application.ports

import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Money

data class OrderConfirmation(
    val recipient: EmailAddress,
    val customerName: String,
    val orderNumber: String,
    val total: Money,
)

interface Mailer {

    fun send(confirmation: OrderConfirmation)
}
