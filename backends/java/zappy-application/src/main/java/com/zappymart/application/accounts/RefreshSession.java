package com.zappymart.application.accounts;

import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.application.ports.TokenIssuer;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.accounts.RefreshToken;
import com.zappymart.domain.accounts.Session;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.time.Instant;
import java.util.Optional;

public final class RefreshSession {

    private final UnitOfWork unitOfWork;
    private final SessionStore sessionStore;
    private final CustomerRepository customerRepository;
    private final TokenIssuer tokenIssuer;
    private final SessionOpening sessionOpening;
    private final Clock clock;

    public RefreshSession(UnitOfWork unitOfWork, SessionStore sessionStore, CustomerRepository customerRepository,
                          TokenIssuer tokenIssuer, SessionOpening sessionOpening, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.sessionStore = sessionStore;
        this.customerRepository = customerRepository;
        this.tokenIssuer = tokenIssuer;
        this.sessionOpening = sessionOpening;
        this.clock = clock;
    }

    public Result<Authentication> execute(String presentedRefreshToken) {
        if (presentedRefreshToken == null || presentedRefreshToken.isBlank()) {
            return sessionInvalid();
        }
        return unitOfWork.inTransaction(() -> {
            Instant moment = clock.now();
            Optional<RefreshToken> stored =
                    sessionStore.refreshTokenByHash(tokenIssuer.hashOfRefreshToken(presentedRefreshToken));
            if (stored.isEmpty()) {
                return sessionInvalid();
            }
            RefreshToken refreshToken = stored.get();
            if (refreshToken.wasAlreadyUsed()) {
                sessionStore.revokeFamily(refreshToken.sessionId(), moment);
                return sessionInvalid();
            }
            if (refreshToken.hasExpiredAt(moment)) {
                return sessionInvalid();
            }
            Optional<Session> session = sessionStore.sessionById(refreshToken.sessionId());
            if (session.isEmpty() || !session.get().isOpenAt(moment)) {
                return sessionInvalid();
            }
            Optional<Customer> customer = customerRepository.byId(session.get().customerId());
            if (customer.isEmpty()) {
                return sessionInvalid();
            }
            sessionStore.save(refreshToken.rotatedAt(moment));
            Session used = sessionStore.save(session.get().usedAt(moment));
            return Result.of(sessionOpening.withNewRefreshToken(customer.get(), used, moment));
        });
    }

    private Result<Authentication> sessionInvalid() {
        return Result.refuse(UserErrorCode.SESSION_INVALID,
                "That refresh token is unknown, expired or already used. Log in again.");
    }
}
