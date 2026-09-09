package nl.zappymart.application.ports

import nl.zappymart.domain.accounts.Wishlist

interface WishlistRepository {

    fun findByOwnerId(ownerId: String): Wishlist

    fun save(wishlist: Wishlist)

    fun delete(ownerId: String)
}
