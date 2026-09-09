package nl.zappymart.domain.accounts

import java.time.Instant

data class Session(
    val id: String,
    val customerId: String,
    val device: String,
    val createdAt: Instant,
    val lastUsedAt: Instant,
    val expiresAt: Instant,
    val revokedAt: Instant?,
) {

    fun isOpenAt(moment: Instant): Boolean = revokedAt == null && moment.isBefore(expiresAt)

    fun usedAt(moment: Instant) = copy(lastUsedAt = moment)

    fun revokedAt(moment: Instant) = copy(revokedAt = moment)

    companion object {
        const val LIFETIME_IN_DAYS = 30L
    }
}
