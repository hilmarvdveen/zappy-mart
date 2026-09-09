package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.shared.Result

class ApplyPromotionCode(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, code: String): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        when (val changed = cartPromotion.applying(cart, code)) {
            is Result.Success -> CartChange.made(carts.save(changed.value))
            is Result.Refused -> CartChange.refused(cart, changed.errors, null)
        }
    }
}
