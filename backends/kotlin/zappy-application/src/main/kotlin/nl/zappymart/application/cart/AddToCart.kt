package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.shared.Result

class AddToCart(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val products: ProductRepository,
    private val identifiers: IdentifierFactory,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, productId: String, quantity: Int): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        val product = products.findById(productId)
        if (product == null) {
            CartChange.productNotFound(cart, productId)
        } else {
            when (val changed = cart.withProductAdded(product, quantity, identifiers.next(), clock.moment())) {
                is Result.Success -> CartChange.made(carts.save(cartPromotion.refreshed(changed.value)))
                is Result.Refused -> CartChange.refused(cart, changed.errors, product)
            }
        }
    }
}
