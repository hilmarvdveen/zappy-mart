package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork

class LogOut(
    private val sessions: SessionRepository,
    private val refreshTokens: RefreshTokenIssuer,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, presentedToken: String?): Boolean = unitOfWork.execute {
        val moment = clock.moment()
        val sessionId = visitor.sessionId
            ?: presentedToken?.let { token -> sessions.findRefreshTokenByHash(refreshTokens.hashOf(token))?.sessionId }
        if (sessionId != null) {
            sessions.revokeSessionAndItsTokens(sessionId, moment)
        }
        true
    }
}
