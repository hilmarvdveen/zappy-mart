package nl.zappymart.application.accounts

import nl.zappymart.application.ports.AccessToken
import nl.zappymart.domain.accounts.Customer

data class Authentication(
    val customer: Customer,
    val sessionId: String,
    val accessToken: AccessToken,
    val refreshToken: String,
)
