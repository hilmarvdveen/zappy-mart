package nl.zappymart.application.ports

import nl.zappymart.domain.accounts.PasswordHash

interface PasswordHasher {

    fun hash(password: String): PasswordHash

    fun matches(password: String, hash: PasswordHash): Boolean
}
