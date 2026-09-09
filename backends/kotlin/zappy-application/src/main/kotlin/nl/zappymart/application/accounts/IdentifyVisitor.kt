package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.SessionRepository

class IdentifyVisitor(
    private val accessTokens: AccessTokenIssuer,
    private val sessions: SessionRepository,
    private val clock: Clock,
) {

    fun execute(bearerToken: String?, cartId: String?): Visitor {
        val signedIn = bearerToken?.takeIf { token -> token.isNotBlank() }?.let { token -> accessTokens.verify(token) }
            ?: return Visitor(null, null, cartId)
        val session = sessions.findById(signedIn.sessionId)
        if (session == null || !session.isOpenAt(clock.moment()) || session.customerId != signedIn.customerId) {
            return Visitor(null, null, cartId)
        }
        return Visitor(signedIn.customerId, signedIn.sessionId, cartId)
    }
}
