package nl.zappymart.domain.cart

import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.Money

data class CartLine(val id: String, val product: Product, val quantity: Int) {

    init {
        require(quantity >= 1) { "A cart line holds one product or more, not $quantity" }
    }

    val lineTotal: Money get() = product.price * quantity
}
