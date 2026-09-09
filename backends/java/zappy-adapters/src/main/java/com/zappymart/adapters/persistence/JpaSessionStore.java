package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.SessionStore;
import com.zappymart.domain.accounts.RefreshToken;
import com.zappymart.domain.accounts.Session;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public final class JpaSessionStore implements SessionStore {

    private final SessionRowRepository sessionRows;
    private final RefreshTokenRowRepository refreshTokenRows;

    JpaSessionStore(SessionRowRepository sessionRows, RefreshTokenRowRepository refreshTokenRows) {
        this.sessionRows = sessionRows;
        this.refreshTokenRows = refreshTokenRows;
    }

    @Override
    public Session save(Session session) {
        sessionRows.save(new SessionRow(session.id(), session.customerId(), session.device(),
                session.createdAt(), session.lastUsedAt(), session.expiresAt(), session.revokedAt()));
        return session;
    }

    @Override
    public Optional<Session> sessionById(String sessionId) {
        return sessionRows.findById(sessionId).map(JpaSessionStore::sessionOf);
    }

    @Override
    public List<Session> openSessionsOf(String customerId, Instant moment) {
        return sessionRows.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(JpaSessionStore::sessionOf)
                .filter(session -> session.isOpenAt(moment))
                .toList();
    }

    @Override
    public RefreshToken save(RefreshToken refreshToken) {
        refreshTokenRows.save(new RefreshTokenRow(refreshToken.id(), refreshToken.sessionId(),
                refreshToken.tokenHash(), refreshToken.createdAt(), refreshToken.expiresAt(),
                refreshToken.rotatedAt()));
        return refreshToken;
    }

    @Override
    public Optional<RefreshToken> refreshTokenByHash(String tokenHash) {
        return refreshTokenRows.findByTokenHash(tokenHash).map(JpaSessionStore::refreshTokenOf);
    }

    @Override
    public void revokeFamily(String sessionId, Instant moment) {
        sessionRows.findById(sessionId).ifPresent(row -> row.revokedAt = moment);
        refreshTokenRows.findBySessionId(sessionId).stream()
                .filter(row -> row.rotatedAt == null)
                .forEach(row -> row.rotatedAt = moment);
    }

    private static Session sessionOf(SessionRow row) {
        return new Session(row.id, row.customerId, row.device, row.createdAt, row.lastUsedAt,
                row.expiresAt, row.revokedAt);
    }

    private static RefreshToken refreshTokenOf(RefreshTokenRow row) {
        return new RefreshToken(row.id, row.sessionId, row.tokenHash, row.createdAt, row.expiresAt, row.rotatedAt);
    }
}
