package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "refresh_tokens")
class RefreshTokenEntity(

    @Id
    @Column(name = "token_hash", length = 128)
    var tokenHash: String = "",

    @Column(name = "session_id", nullable = false, length = 64)
    var sessionId: String = "",

    @Column(name = "issued_at", nullable = false)
    var issuedAt: Instant = Instant.EPOCH,

    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant = Instant.EPOCH,

    @Column(name = "rotated_at")
    var rotatedAt: Instant? = null,
)
