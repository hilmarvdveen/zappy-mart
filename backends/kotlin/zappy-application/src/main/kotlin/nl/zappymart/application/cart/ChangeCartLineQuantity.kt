package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.shared.Result

class ChangeCartLineQuantity(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, lineId: String, quantity: Int): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        when (val changed = cart.withLineQuantityChanged(lineId, quantity, clock.moment())) {
            is Result.Success -> CartChange.made(carts.save(cartPromotion.refreshed(changed.value)))
            is Result.Refused -> CartChange.refused(cart, changed.errors, cart.lines.firstOrNull { line -> line.id == lineId }?.product)
        }
    }
}
