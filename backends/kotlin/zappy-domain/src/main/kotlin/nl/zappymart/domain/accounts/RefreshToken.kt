package nl.zappymart.domain.accounts

import java.time.Instant

data class RefreshToken(
    val tokenHash: String,
    val sessionId: String,
    val issuedAt: Instant,
    val expiresAt: Instant,
    val rotatedAt: Instant?,
) {

    fun isUsableAt(moment: Instant): Boolean = rotatedAt == null && moment.isBefore(expiresAt)

    fun wasAlreadyUsed(): Boolean = rotatedAt != null

    fun rotatedAt(moment: Instant) = copy(rotatedAt = moment)
}
