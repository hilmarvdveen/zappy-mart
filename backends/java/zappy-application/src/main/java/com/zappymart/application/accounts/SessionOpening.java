package com.zappymart.application.accounts;

import com.zappymart.application.ports.AccessToken;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.application.ports.TokenIssuer;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.accounts.RefreshToken;
import com.zappymart.domain.accounts.Session;

import java.time.Duration;
import java.time.Instant;

public final class SessionOpening {

    public static final Duration REFRESH_TOKEN_LIFETIME = Duration.ofDays(30);

    private final SessionStore sessionStore;
    private final TokenIssuer tokenIssuer;
    private final IdentifierGenerator identifierGenerator;
    private final Clock clock;

    public SessionOpening(SessionStore sessionStore, TokenIssuer tokenIssuer,
                          IdentifierGenerator identifierGenerator, Clock clock) {
        this.sessionStore = sessionStore;
        this.tokenIssuer = tokenIssuer;
        this.identifierGenerator = identifierGenerator;
        this.clock = clock;
    }

    public Authentication openFor(Customer customer, String device) {
        Instant moment = clock.now();
        Session session = sessionStore.save(Session.opened(identifierGenerator.next(), customer.id(),
                deviceOrDefault(device), moment, moment.plus(REFRESH_TOKEN_LIFETIME)));
        return withNewRefreshToken(customer, session, moment);
    }

    public Authentication withNewRefreshToken(Customer customer, Session session, Instant moment) {
        String refreshToken = tokenIssuer.newRefreshToken();
        sessionStore.save(RefreshToken.issued(identifierGenerator.next(), session.id(),
                tokenIssuer.hashOfRefreshToken(refreshToken), moment, moment.plus(REFRESH_TOKEN_LIFETIME)));
        AccessToken accessToken = tokenIssuer.issueAccessToken(customer.id(), session.id());
        return new Authentication(customer, accessToken, refreshToken, session.id());
    }

    private static String deviceOrDefault(String device) {
        return device == null || device.isBlank() ? "An unnamed device" : device;
    }
}
