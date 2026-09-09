package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.shared.UserError
import nl.zappymart.domain.shared.UserErrorCode

class AddToWishlist(
    private val wishlists: WishlistRepository,
    private val products: ProductRepository,
    private val viewWishlist: ViewWishlist,
    private val wishlistOwner: WishlistOwner,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, productId: String): WishlistChange = unitOfWork.execute {
        val ownerId = wishlistOwner.forWriting(visitor)
        val anonymousCartId = if (visitor.isSignedIn) null else ownerId
        if (products.findById(productId) == null) {
            WishlistChange(
                viewWishlist.inWishlistOrder(wishlists.findByOwnerId(ownerId).productIds),
                anonymousCartId,
                listOf(UserError(UserErrorCode.PRODUCT_NOT_FOUND, "There is no product $productId.", "productId")),
            )
        } else {
            val saved = wishlists.findByOwnerId(ownerId).with(productId)
            wishlists.save(saved)
            WishlistChange(viewWishlist.inWishlistOrder(saved.productIds), anonymousCartId, emptyList())
        }
    }
}
