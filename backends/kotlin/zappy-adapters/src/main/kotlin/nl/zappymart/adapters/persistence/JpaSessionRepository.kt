package nl.zappymart.adapters.persistence

import java.time.Instant
import nl.zappymart.adapters.persistence.entities.RefreshTokenEntity
import nl.zappymart.adapters.persistence.entities.SessionEntity
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaSessionRepository(
    private val sessions: SessionEntities,
    private val refreshTokens: RefreshTokenEntities,
) : SessionRepository {

    @Transactional
    override fun save(session: Session): Session {
        val entity = sessions.findById(session.id).orElseGet { SessionEntity(id = session.id) }
        entity.customerId = session.customerId
        entity.device = session.device
        entity.createdAt = session.createdAt
        entity.lastUsedAt = session.lastUsedAt
        entity.expiresAt = session.expiresAt
        entity.revokedAt = session.revokedAt
        return sessions.save(entity).asSession()
    }

    override fun findById(sessionId: String): Session? = sessions.findById(sessionId).orElse(null)?.asSession()

    override fun findOpenForCustomer(customerId: String, moment: Instant): List<Session> =
        sessions.findByCustomerIdOrderByCreatedAtDesc(customerId)
            .map { entity -> entity.asSession() }
            .filter { session -> session.isOpenAt(moment) }

    @Transactional
    override fun saveRefreshToken(token: RefreshToken): RefreshToken {
        val entity = refreshTokens.findById(token.tokenHash).orElseGet {
            RefreshTokenEntity(tokenHash = token.tokenHash)
        }
        entity.sessionId = token.sessionId
        entity.issuedAt = token.issuedAt
        entity.expiresAt = token.expiresAt
        entity.rotatedAt = token.rotatedAt
        return refreshTokens.save(entity).asRefreshToken()
    }

    override fun findRefreshTokenByHash(tokenHash: String): RefreshToken? =
        refreshTokens.findById(tokenHash).orElse(null)?.asRefreshToken()

    @Transactional
    override fun revokeSessionAndItsTokens(sessionId: String, moment: Instant) {
        sessions.findById(sessionId).ifPresent { entity ->
            entity.revokedAt = entity.revokedAt ?: moment
            sessions.save(entity)
        }
        refreshTokens.findBySessionId(sessionId).forEach { token ->
            token.rotatedAt = token.rotatedAt ?: moment
            refreshTokens.save(token)
        }
    }
}
