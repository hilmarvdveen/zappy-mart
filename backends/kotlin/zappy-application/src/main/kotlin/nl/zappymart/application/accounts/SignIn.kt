package nl.zappymart.application.accounts

import java.time.temporal.ChronoUnit
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session

class SignIn(
    private val sessions: SessionRepository,
    private val accessTokens: AccessTokenIssuer,
    private val refreshTokens: RefreshTokenIssuer,
    private val identifiers: IdentifierFactory,
    private val clock: Clock,
) {

    fun start(customer: Customer, device: String): Authentication {
        val moment = clock.moment()
        val expiresAt = moment.plus(Session.LIFETIME_IN_DAYS, ChronoUnit.DAYS)
        val session = sessions.save(
            Session(
                id = identifiers.next(),
                customerId = customer.id,
                device = device,
                createdAt = moment,
                lastUsedAt = moment,
                expiresAt = expiresAt,
                revokedAt = null,
            ),
        )
        val issued = refreshTokens.issue()
        sessions.saveRefreshToken(RefreshToken(issued.tokenHash, session.id, moment, expiresAt, null))
        return Authentication(
            customer,
            session.id,
            accessTokens.issue(customer.id, session.id, moment),
            issued.value,
        )
    }
}
