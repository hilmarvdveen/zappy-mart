package nl.zappymart.application.ordering

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.Order

class FindOrder(private val orders: OrderRepository) {

    fun execute(visitor: Visitor, orderId: String): Order? {
        val customerId = visitor.customerId ?: return null
        return orders.findForCustomer(orderId, customerId)
    }
}
