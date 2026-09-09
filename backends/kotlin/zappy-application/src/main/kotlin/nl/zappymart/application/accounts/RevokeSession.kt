package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

class RevokeSession(
    private val sessions: SessionRepository,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, sessionId: String): Result<List<Session>> {
        val customerId = visitor.customerId
            ?: return refusal(UserErrorCode.NOT_AUTHENTICATED, "Revoking a session needs a signed in customer.")
        return unitOfWork.execute {
            val moment = clock.moment()
            val session = sessions.findById(sessionId)
            if (session == null || session.customerId != customerId) {
                refusal(UserErrorCode.SESSION_NOT_FOUND, "That session does not belong to you.", "sessionId")
            } else {
                sessions.revokeSessionAndItsTokens(sessionId, moment)
                Result.Success(sessions.findOpenForCustomer(customerId, moment))
            }
        }
    }
}
