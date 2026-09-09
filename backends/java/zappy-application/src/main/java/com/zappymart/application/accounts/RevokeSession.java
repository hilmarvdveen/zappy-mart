package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.accounts.Session;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public final class RevokeSession {

    private final UnitOfWork unitOfWork;
    private final SessionStore sessionStore;
    private final Clock clock;

    public RevokeSession(UnitOfWork unitOfWork, SessionStore sessionStore, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.sessionStore = sessionStore;
        this.clock = clock;
    }

    public Result<List<Session>> execute(Visitor visitor, String sessionId) {
        if (!visitor.isSignedIn()) {
            return Result.refuse(UserErrorCode.NOT_AUTHENTICATED,
                    "Sign in to manage your sessions.");
        }
        return unitOfWork.inTransaction(() -> {
            Instant moment = clock.now();
            Optional<Session> session = sessionStore.sessionById(sessionId)
                    .filter(found -> found.customerId().equals(visitor.customerId()))
                    .filter(found -> found.isOpenAt(moment));
            if (session.isEmpty()) {
                return Result.refuse(UserErrorCode.SESSION_NOT_FOUND,
                        "You have no open session with that id.", "sessionId");
            }
            sessionStore.revokeFamily(session.get().id(), moment);
            return Result.of(sessionStore.openSessionsOf(visitor.customerId(), moment));
        });
    }
}
