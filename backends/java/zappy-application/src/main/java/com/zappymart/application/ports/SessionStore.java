package com.zappymart.application.ports;

import com.zappymart.domain.accounts.RefreshToken;
import com.zappymart.domain.accounts.Session;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SessionStore {

    Session save(Session session);

    Optional<Session> sessionById(String sessionId);

    List<Session> openSessionsOf(String customerId, Instant moment);

    RefreshToken save(RefreshToken refreshToken);

    Optional<RefreshToken> refreshTokenByHash(String tokenHash);

    void revokeFamily(String sessionId, Instant moment);
}
