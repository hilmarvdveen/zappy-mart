package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "sessions")
class SessionEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "customer_id", nullable = false, length = 64)
    var customerId: String = "",

    @Column(name = "device", nullable = false)
    var device: String = "",

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.EPOCH,

    @Column(name = "last_used_at", nullable = false)
    var lastUsedAt: Instant = Instant.EPOCH,

    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant = Instant.EPOCH,

    @Column(name = "revoked_at")
    var revokedAt: Instant? = null,
)
