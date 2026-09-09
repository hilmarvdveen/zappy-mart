package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.application.ports.TokenIssuer;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.accounts.RefreshToken;

import java.time.Instant;
import java.util.Optional;

public final class LogOut {

    private final UnitOfWork unitOfWork;
    private final SessionStore sessionStore;
    private final TokenIssuer tokenIssuer;
    private final Clock clock;

    public LogOut(UnitOfWork unitOfWork, SessionStore sessionStore, TokenIssuer tokenIssuer, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.sessionStore = sessionStore;
        this.tokenIssuer = tokenIssuer;
        this.clock = clock;
    }

    public boolean execute(Visitor visitor, String presentedRefreshToken) {
        return unitOfWork.inTransaction(() -> {
            Instant moment = clock.now();
            sessionIdOf(visitor, presentedRefreshToken)
                    .ifPresent(sessionId -> sessionStore.revokeFamily(sessionId, moment));
            return true;
        });
    }

    private Optional<String> sessionIdOf(Visitor visitor, String presentedRefreshToken) {
        if (visitor.sessionId() != null) {
            return Optional.of(visitor.sessionId());
        }
        if (presentedRefreshToken == null || presentedRefreshToken.isBlank()) {
            return Optional.empty();
        }
        return sessionStore.refreshTokenByHash(tokenIssuer.hashOfRefreshToken(presentedRefreshToken))
                .map(RefreshToken::sessionId);
    }
}
