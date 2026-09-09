package nl.zappymart.domain.ordering

import nl.zappymart.domain.shared.Money

data class OrderLine(
    val productId: String,
    val productName: String,
    val unitPrice: Money,
    val quantity: Int,
) {
    val lineTotal: Money get() = unitPrice * quantity
}
