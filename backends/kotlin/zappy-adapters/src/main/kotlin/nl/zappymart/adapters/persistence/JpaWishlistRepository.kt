package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.WishlistEntryEntity
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.accounts.Wishlist
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaWishlistRepository(private val entries: WishlistEntries) : WishlistRepository {

    override fun findByOwnerId(ownerId: String): Wishlist = Wishlist(
        ownerId,
        entries.findByOwnerIdOrderByPositionAsc(ownerId).map { entry -> entry.productId },
    )

    @Transactional
    override fun save(wishlist: Wishlist) {
        entries.deleteByOwnerId(wishlist.ownerId)
        entries.flush()
        wishlist.productIds.forEachIndexed { position, productId ->
            entries.save(WishlistEntryEntity(ownerId = wishlist.ownerId, productId = productId, position = position))
        }
    }

    @Transactional
    override fun delete(ownerId: String) {
        entries.deleteByOwnerId(ownerId)
    }
}
