package nl.zappymart.adapters.security

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.util.HexFormat
import nl.zappymart.application.ports.IssuedRefreshToken
import nl.zappymart.application.ports.RefreshTokenIssuer
import org.springframework.stereotype.Component

@Component
class RandomRefreshTokenIssuer : RefreshTokenIssuer {

    private val random = SecureRandom()

    override fun issue(): IssuedRefreshToken {
        val bytes = ByteArray(TOKEN_LENGTH_IN_BYTES)
        random.nextBytes(bytes)
        val value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        return IssuedRefreshToken(value, hashOf(value))
    }

    override fun hashOf(value: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toByteArray()))

    private companion object {
        const val TOKEN_LENGTH_IN_BYTES = 32
    }
}
