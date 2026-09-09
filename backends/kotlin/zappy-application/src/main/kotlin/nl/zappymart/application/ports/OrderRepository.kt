package nl.zappymart.application.ports

import nl.zappymart.domain.ordering.Order

interface OrderRepository {

    fun save(order: Order): Order

    fun page(customerId: String, size: Int, afterOrderId: String?): List<Order>

    fun count(customerId: String): Int

    fun findForCustomer(orderId: String, customerId: String): Order?
}
