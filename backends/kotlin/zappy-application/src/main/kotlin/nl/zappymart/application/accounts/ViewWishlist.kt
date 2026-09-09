package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.catalogue.Product

class ViewWishlist(
    private val wishlists: WishlistRepository,
    private val products: ProductRepository,
    private val wishlistOwner: WishlistOwner,
) {

    fun execute(visitor: Visitor): List<Product> {
        val ownerId = wishlistOwner.forReading(visitor) ?: return emptyList()
        return inWishlistOrder(wishlists.findByOwnerId(ownerId).productIds)
    }

    fun inWishlistOrder(productIds: List<String>): List<Product> {
        if (productIds.isEmpty()) {
            return emptyList()
        }
        val found = products.findAllByIds(productIds).associateBy { product -> product.id }
        return productIds.mapNotNull { productId -> found[productId] }
    }
}
