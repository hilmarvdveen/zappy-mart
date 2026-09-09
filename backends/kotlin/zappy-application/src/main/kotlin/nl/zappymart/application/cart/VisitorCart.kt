package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.shared.Result

class VisitorCart(
    private val carts: CartRepository,
    private val clock: Clock,
    private val identifiers: IdentifierFactory,
) {

    fun of(visitor: Visitor): Cart {
        val moment = clock.moment()
        val customerId = visitor.customerId
        if (customerId != null) {
            return carts.findByCustomerId(customerId) ?: Cart.empty(identifiers.next(), customerId, moment)
        }
        val cartId = visitor.cartId
        if (cartId != null) {
            val found = carts.findById(cartId)
            if (found != null) {
                return found
            }
        }
        return Cart.empty(identifiers.next(), null, moment)
    }

    fun moveToCustomer(visitor: Visitor, customerId: String): Cart {
        val moment = clock.moment()
        val customerCart = carts.findByCustomerId(customerId)
        val anonymousCart = visitor.cartId?.let { cartId -> carts.findById(cartId) }
        if (anonymousCart == null || anonymousCart.customerId != null) {
            return customerCart ?: Cart.empty(identifiers.next(), customerId, moment)
        }
        if (customerCart == null) {
            return carts.save(anonymousCart.belongingTo(customerId, moment))
        }
        val merged = anonymousCart.lines.fold(customerCart) { running, line ->
            when (val added = running.withProductAdded(line.product, line.quantity, identifiers.next(), moment)) {
                is Result.Success -> added.value
                is Result.Refused -> running
            }
        }
        carts.delete(anonymousCart.id)
        return carts.save(merged)
    }
}
