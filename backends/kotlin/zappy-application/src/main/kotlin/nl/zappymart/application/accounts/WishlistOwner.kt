package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.WishlistRepository

class WishlistOwner(
    private val wishlists: WishlistRepository,
    private val visitorCart: VisitorCart,
    private val carts: CartRepository,
) {

    fun forReading(visitor: Visitor): String? = visitor.customerId ?: visitor.cartId

    fun forWriting(visitor: Visitor): String = visitor.customerId ?: carts.save(visitorCart.of(visitor)).id

    fun moveToCustomer(visitor: Visitor, customerId: String) {
        val anonymousOwnerId = visitor.cartId ?: return
        val anonymous = wishlists.findByOwnerId(anonymousOwnerId)
        if (anonymous.productIds.isEmpty()) {
            return
        }
        wishlists.save(wishlists.findByOwnerId(customerId).mergedWith(anonymous))
        wishlists.delete(anonymousOwnerId)
    }
}
