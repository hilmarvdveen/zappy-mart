package nl.zappymart.application.cart

import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.UserError
import nl.zappymart.domain.shared.UserErrorCode

data class CartChange(val cart: Cart, val availableStock: Int?, val errors: List<UserError>) {

    companion object {

        fun made(cart: Cart) = CartChange(cart, null, emptyList())

        fun refused(cart: Cart, errors: List<UserError>, product: Product?): CartChange {
            val ranOutOfStock = errors.any { error -> error.code == UserErrorCode.OUT_OF_STOCK }
            return CartChange(cart, if (ranOutOfStock) product?.stock else null, errors)
        }

        fun productNotFound(cart: Cart, productId: String) = CartChange(
            cart,
            null,
            listOf(UserError(UserErrorCode.PRODUCT_NOT_FOUND, "There is no product $productId.", "productId")),
        )
    }
}
