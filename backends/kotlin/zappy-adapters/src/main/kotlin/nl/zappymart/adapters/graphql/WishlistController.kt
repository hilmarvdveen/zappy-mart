package nl.zappymart.adapters.graphql

import nl.zappymart.application.accounts.AddToWishlist
import nl.zappymart.application.accounts.RemoveFromWishlist
import nl.zappymart.application.accounts.ViewWishlist
import nl.zappymart.application.accounts.WishlistChange
import nl.zappymart.domain.catalogue.Product
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.stereotype.Controller

@Controller
class WishlistController(
    private val viewWishlist: ViewWishlist,
    private val addToWishlist: AddToWishlist,
    private val removeFromWishlist: RemoveFromWishlist,
) {

    @QueryMapping
    fun wishlist(@ContextValue requestContext: RequestContext): List<Product> =
        viewWishlist.execute(requestContext.visitor)

    @MutationMapping
    fun addToWishlist(
        @ContextValue requestContext: RequestContext,
        @Argument productId: String,
    ): WishlistPayload = answer(requestContext, addToWishlist.execute(requestContext.visitor, productId))

    @MutationMapping
    fun removeFromWishlist(
        @ContextValue requestContext: RequestContext,
        @Argument productId: String,
    ): WishlistPayload = answer(requestContext, removeFromWishlist.execute(requestContext.visitor, productId))

    private fun answer(requestContext: RequestContext, change: WishlistChange): WishlistPayload {
        change.anonymousCartId?.let { cartId -> requestContext.remembersCart(cartId) }
        return WishlistPayload(change.products, change.errors)
    }
}
