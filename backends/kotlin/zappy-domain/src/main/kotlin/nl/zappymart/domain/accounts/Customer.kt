package nl.zappymart.domain.accounts

import java.time.Instant
import nl.zappymart.domain.shared.EmailAddress

data class Customer(
    val id: String,
    val email: EmailAddress,
    val name: String,
    val passwordHash: PasswordHash,
    val createdAt: Instant,
)
