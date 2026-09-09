package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository

class RemoveFromWishlist(
    private val wishlists: WishlistRepository,
    private val viewWishlist: ViewWishlist,
    private val wishlistOwner: WishlistOwner,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, productId: String): WishlistChange = unitOfWork.execute {
        val ownerId = wishlistOwner.forWriting(visitor)
        val saved = wishlists.findByOwnerId(ownerId).without(productId)
        wishlists.save(saved)
        WishlistChange(
            viewWishlist.inWishlistOrder(saved.productIds),
            if (visitor.isSignedIn) null else ownerId,
            emptyList(),
        )
    }
}
