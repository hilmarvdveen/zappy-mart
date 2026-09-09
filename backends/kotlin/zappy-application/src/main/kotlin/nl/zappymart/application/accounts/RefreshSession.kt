package nl.zappymart.application.accounts

import java.time.Instant
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

class RefreshSession(
    private val sessions: SessionRepository,
    private val customers: CustomerRepository,
    private val accessTokens: AccessTokenIssuer,
    private val refreshTokens: RefreshTokenIssuer,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(presentedToken: String?): Result<Authentication> {
        if (presentedToken.isNullOrBlank()) {
            return sessionInvalid()
        }
        return unitOfWork.execute {
            val moment = clock.moment()
            val stored = sessions.findRefreshTokenByHash(refreshTokens.hashOf(presentedToken))
            when {
                stored == null -> sessionInvalid()

                stored.wasAlreadyUsed() -> {
                    sessions.revokeSessionAndItsTokens(stored.sessionId, moment)
                    sessionInvalid()
                }

                !stored.isUsableAt(moment) -> sessionInvalid()

                else -> rotate(stored, moment)
            }
        }
    }

    private fun rotate(stored: RefreshToken, moment: Instant): Result<Authentication> {
        val session = sessions.findById(stored.sessionId)
        if (session == null || !session.isOpenAt(moment)) {
            return sessionInvalid()
        }
        val customer = customers.findById(session.customerId) ?: return sessionInvalid()
        sessions.saveRefreshToken(stored.rotatedAt(moment))
        val issued = refreshTokens.issue()
        sessions.saveRefreshToken(RefreshToken(issued.tokenHash, session.id, moment, session.expiresAt, null))
        sessions.save(session.usedAt(moment))
        return Result.Success(
            Authentication(
                customer,
                session.id,
                accessTokens.issue(customer.id, session.id, moment),
                issued.value,
            ),
        )
    }

    private fun sessionInvalid() = refusal(
        UserErrorCode.SESSION_INVALID,
        "That session cannot be refreshed. Please log in again.",
    )
}
