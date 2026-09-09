package nl.zappymart.application.ordering

import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderConfirmation
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.OrderPlaced

class SendOrderConfirmation(
    private val customers: CustomerRepository,
    private val orders: OrderRepository,
    private val mailer: Mailer,
) {

    fun handle(event: OrderPlaced) {
        val customer = customers.findById(event.customerId) ?: return
        val order = orders.findForCustomer(event.orderId, event.customerId) ?: return
        mailer.send(OrderConfirmation(customer.email, customer.name, order.number, order.total))
    }
}
