package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "carts")
class CartEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "customer_id", length = 64)
    var customerId: String? = null,

    @Column(name = "promotion_code", length = 64)
    var promotionCode: String? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.EPOCH,

    @OneToMany(
        mappedBy = "cart",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.EAGER,
    )
    @OrderBy("position ASC")
    var lines: MutableList<CartLineEntity> = mutableListOf(),
)
