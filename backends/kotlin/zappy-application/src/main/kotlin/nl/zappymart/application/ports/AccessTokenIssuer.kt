package nl.zappymart.application.ports

import java.time.Instant

data class AccessToken(val value: String, val expiresAt: Instant)

data class SignedInVisitor(val customerId: String, val sessionId: String)

interface AccessTokenIssuer {

    fun issue(customerId: String, sessionId: String, moment: Instant): AccessToken

    fun verify(token: String): SignedInVisitor?
}
