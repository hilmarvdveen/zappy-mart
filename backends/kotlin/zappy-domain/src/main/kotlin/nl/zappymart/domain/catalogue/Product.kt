package nl.zappymart.domain.catalogue

import nl.zappymart.domain.shared.Money

data class Product(
    val id: String,
    val name: String,
    val slug: String,
    val description: String,
    val price: Money,
    val category: Category,
    val stock: Int,
    val imageUrl: String?,
) {

    fun hasStockFor(quantity: Int): Boolean = stock >= quantity

    fun withStockReducedBy(quantity: Int): Product {
        require(hasStockFor(quantity)) { "Product $id has $stock in stock and cannot give up $quantity" }
        return copy(stock = stock - quantity)
    }
}
