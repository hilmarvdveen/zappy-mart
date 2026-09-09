package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "promotions")
class PromotionEntity(

    @Id
    @Column(name = "code", length = 64)
    var code: String = "",

    @Column(name = "kind", nullable = false, length = 32)
    var kind: String = "",

    @Column(name = "percentage")
    var percentage: Int? = null,

    @Column(name = "amount")
    var amount: Int? = null,

    @Column(name = "minimum_subtotal")
    var minimumSubtotal: Int? = null,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @Column(name = "valid_from", nullable = false)
    var validFrom: Instant = Instant.EPOCH,

    @Column(name = "valid_until", nullable = false)
    var validUntil: Instant = Instant.EPOCH,

    @Column(name = "usage_limit")
    var usageLimit: Int? = null,

    @Column(name = "times_used", nullable = false)
    var timesUsed: Int = 0,
)
