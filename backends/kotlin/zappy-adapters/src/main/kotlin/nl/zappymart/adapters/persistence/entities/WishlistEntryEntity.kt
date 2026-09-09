package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "wishlist_entries")
class WishlistEntryEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @Column(name = "id")
    var id: Long? = null,

    @Column(name = "owner_id", nullable = false, length = 64)
    var ownerId: String = "",

    @Column(name = "product_id", nullable = false, length = 64)
    var productId: String = "",

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
