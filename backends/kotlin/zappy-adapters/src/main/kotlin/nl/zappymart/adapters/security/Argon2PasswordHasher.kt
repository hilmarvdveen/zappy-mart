package nl.zappymart.adapters.security

import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.domain.accounts.PasswordHash
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.stereotype.Component

@Component
class Argon2PasswordHasher : PasswordHasher {

    private val encoder = Argon2PasswordEncoder(
        SALT_LENGTH_IN_BYTES,
        HASH_LENGTH_IN_BYTES,
        PARALLELISM,
        MEMORY_IN_KIBIBYTES,
        ITERATIONS,
    )

    override fun hash(password: String) = PasswordHash(requireNotNull(encoder.encode(password)))

    override fun matches(password: String, hash: PasswordHash) = encoder.matches(password, hash.value)

    private companion object {
        const val SALT_LENGTH_IN_BYTES = 16
        const val HASH_LENGTH_IN_BYTES = 32
        const val PARALLELISM = 1
        const val MEMORY_IN_KIBIBYTES = 19456
        const val ITERATIONS = 2
    }
}
