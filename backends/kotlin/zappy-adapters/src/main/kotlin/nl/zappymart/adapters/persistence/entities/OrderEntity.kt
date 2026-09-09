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
@Table(name = "orders")
class OrderEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "sequence_number", nullable = false, unique = true)
    var sequenceNumber: Long = 0,

    @Column(name = "number", nullable = false, unique = true, length = 64)
    var number: String = "",

    @Column(name = "customer_id", nullable = false, length = 64)
    var customerId: String = "",

    @Column(name = "status", nullable = false, length = 32)
    var status: String = "",

    @Column(name = "promotion_code", length = 64)
    var promotionCode: String? = null,

    @Column(name = "subtotal", nullable = false)
    var subtotal: Int = 0,

    @Column(name = "discount", nullable = false)
    var discount: Int = 0,

    @Column(name = "shipping", nullable = false)
    var shipping: Int = 0,

    @Column(name = "total", nullable = false)
    var total: Int = 0,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @Column(name = "placed_at", nullable = false)
    var placedAt: Instant = Instant.EPOCH,

    @OneToMany(
        mappedBy = "order",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.EAGER,
    )
    @OrderBy("position ASC")
    var lines: MutableList<OrderLineEntity> = mutableListOf(),
)
