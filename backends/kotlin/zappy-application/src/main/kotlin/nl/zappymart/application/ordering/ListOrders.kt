package nl.zappymart.application.ordering

import nl.zappymart.application.Page
import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.Order

class ListOrders(private val orders: OrderRepository) {

    fun execute(visitor: Visitor, first: Int, afterOrderId: String?): Page<Order> {
        val customerId = visitor.customerId ?: return Page(emptyList(), false, 0)
        val size = Page.sizeAsked(first)
        val fetched = orders.page(customerId, size + 1, afterOrderId)
        return Page(fetched.take(size), fetched.size > size, orders.count(customerId))
    }
}
