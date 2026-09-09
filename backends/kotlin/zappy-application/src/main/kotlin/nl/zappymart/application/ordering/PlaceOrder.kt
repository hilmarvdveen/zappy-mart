package nl.zappymart.application.ordering

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.OrderNumberFactory
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

class PlaceOrder(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val products: ProductRepository,
    private val orders: OrderRepository,
    private val identifiers: IdentifierFactory,
    private val orderNumbers: OrderNumberFactory,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
    private val events: DomainEventPublisher,
) {

    fun execute(visitor: Visitor): Result<Order> {
        val customerId = visitor.customerId
            ?: return refusal(UserErrorCode.NOT_AUTHENTICATED, "Placing an order needs a signed in customer.")
        return unitOfWork.execute {
            val cart = cartPromotion.refreshed(visitorCart.of(visitor))
            val moment = clock.moment()
            val placed = Order.place(cart, customerId, identifiers.next(), orderNumbers.next(moment), moment)
            if (placed is Result.Success) {
                val order = placed.value
                products.reduceStock(order.lines.associate { line -> line.productId to line.quantity })
                orders.save(order)
                carts.save(cart.emptied(moment))
                events.publish(order.placed())
            }
            placed
        }
    }
}
