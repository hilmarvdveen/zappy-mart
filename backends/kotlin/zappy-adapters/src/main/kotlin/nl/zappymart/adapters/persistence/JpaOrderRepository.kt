package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.OrderEntity
import nl.zappymart.adapters.persistence.entities.OrderLineEntity
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.Order
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaOrderRepository(private val orders: OrderEntities) : OrderRepository {

    @Transactional
    override fun save(order: Order): Order {
        val entity = OrderEntity(
            sequenceNumber = orders.highestSequenceNumber() + 1,
            id = order.id,
            number = order.number,
            customerId = order.customerId,
            status = order.status.name,
            promotionCode = order.promotionCode?.value,
            subtotal = order.subtotal.amount,
            discount = order.discount.amount,
            shipping = order.shipping.amount,
            total = order.total.amount,
            currency = order.total.currency,
            placedAt = order.placedAt,
        )
        order.lines.forEachIndexed { position, line ->
            entity.lines.add(
                OrderLineEntity(
                    order = entity,
                    productId = line.productId,
                    productName = line.productName,
                    unitPrice = line.unitPrice.amount,
                    currency = line.unitPrice.currency,
                    quantity = line.quantity,
                    position = position,
                ),
            )
        }
        return orders.save(entity).asOrder()
    }

    override fun page(customerId: String, size: Int, afterOrderId: String?): List<Order> {
        if (size <= 0) {
            return emptyList()
        }
        val newestFirst = orders.findByCustomerIdOrderBySequenceNumberDesc(customerId)
        val startAt = if (afterOrderId == null) {
            0
        } else {
            newestFirst.indexOfFirst { entity -> entity.id == afterOrderId } + 1
        }
        if (startAt <= 0 && afterOrderId != null) {
            return emptyList()
        }
        return newestFirst.drop(startAt).take(size).map { entity -> entity.asOrder() }
    }

    override fun count(customerId: String): Int = orders.countByCustomerId(customerId).toInt()

    override fun findForCustomer(orderId: String, customerId: String): Order? =
        orders.findByIdAndCustomerId(orderId, customerId)?.asOrder()
}
