package nl.zappymart.application.ports

data class IssuedRefreshToken(val value: String, val tokenHash: String)

interface RefreshTokenIssuer {

    fun issue(): IssuedRefreshToken

    fun hashOf(value: String): String
}
