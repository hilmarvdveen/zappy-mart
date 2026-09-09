package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.domain.cart.Cart

class ViewCart(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
) {

    fun execute(visitor: Visitor): Cart = cartPromotion.refreshed(visitorCart.of(visitor))
}
