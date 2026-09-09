package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.UnitOfWork

class RemovePromotionCode(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        CartChange.made(carts.save(cart.withoutPromotion(clock.moment())))
    }
}
