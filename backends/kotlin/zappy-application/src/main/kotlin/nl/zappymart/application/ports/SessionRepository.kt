package nl.zappymart.application.ports

import java.time.Instant
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session

interface SessionRepository {

    fun save(session: Session): Session

    fun findById(sessionId: String): Session?

    fun findOpenForCustomer(customerId: String, moment: Instant): List<Session>

    fun saveRefreshToken(token: RefreshToken): RefreshToken

    fun findRefreshTokenByHash(tokenHash: String): RefreshToken?

    fun revokeSessionAndItsTokens(sessionId: String, moment: Instant)
}
