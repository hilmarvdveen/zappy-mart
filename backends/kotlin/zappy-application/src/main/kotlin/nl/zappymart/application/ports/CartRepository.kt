package nl.zappymart.application.ports

import nl.zappymart.domain.cart.Cart

interface CartRepository {

    fun findById(cartId: String): Cart?

    fun findByCustomerId(customerId: String): Cart?

    fun save(cart: Cart): Cart

    fun delete(cartId: String)
}
