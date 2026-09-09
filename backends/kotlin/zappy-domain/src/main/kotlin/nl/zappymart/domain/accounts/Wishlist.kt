package nl.zappymart.domain.accounts

data class Wishlist(val ownerId: String, val productIds: List<String>) {

    fun with(productId: String): Wishlist =
        if (productIds.contains(productId)) this else copy(productIds = listOf(productId) + productIds)

    fun without(productId: String): Wishlist =
        copy(productIds = productIds.filterNot { saved -> saved == productId })

    fun mergedWith(other: Wishlist): Wishlist =
        other.productIds.reversed().fold(this) { running, productId -> running.with(productId) }

    companion object {
        fun emptyFor(ownerId: String) = Wishlist(ownerId, emptyList())
    }
}
