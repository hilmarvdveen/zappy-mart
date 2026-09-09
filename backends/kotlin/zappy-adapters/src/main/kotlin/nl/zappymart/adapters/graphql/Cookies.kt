package nl.zappymart.adapters.graphql

import java.time.Duration
import nl.zappymart.domain.accounts.Session
import org.springframework.http.ResponseCookie

class Cookies(private val properties: SecurityProperties) {

    fun refreshToken(value: String): String = ResponseCookie.from(REFRESH_TOKEN_NAME, value)
        .httpOnly(true)
        .secure(properties.cookiesSecure)
        .sameSite("Lax")
        .path(properties.graphQlPath)
        .maxAge(Duration.ofDays(Session.LIFETIME_IN_DAYS))
        .build()
        .toString()

    fun clearedRefreshToken(): String = ResponseCookie.from(REFRESH_TOKEN_NAME, "")
        .httpOnly(true)
        .secure(properties.cookiesSecure)
        .sameSite("Lax")
        .path(properties.graphQlPath)
        .maxAge(Duration.ZERO)
        .build()
        .toString()

    fun cart(cartId: String): String = ResponseCookie.from(CART_NAME, cartId)
        .httpOnly(true)
        .secure(properties.cookiesSecure)
        .sameSite("Lax")
        .path("/")
        .maxAge(Duration.ofDays(CART_LIFETIME_IN_DAYS))
        .build()
        .toString()

    companion object {
        const val REFRESH_TOKEN_NAME = "zappy_refresh"
        const val CART_NAME = "zappy_cart"
        const val CART_LIFETIME_IN_DAYS = 30L
    }
}
