package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.application.ports.SignedInVisitor;
import com.zappymart.application.ports.TokenIssuer;
import com.zappymart.domain.accounts.Session;

import java.util.Optional;

public final class IdentifyVisitor {

    private final TokenIssuer tokenIssuer;
    private final SessionStore sessionStore;
    private final IdentifierGenerator identifierGenerator;
    private final Clock clock;

    public IdentifyVisitor(TokenIssuer tokenIssuer, SessionStore sessionStore,
                           IdentifierGenerator identifierGenerator, Clock clock) {
        this.tokenIssuer = tokenIssuer;
        this.sessionStore = sessionStore;
        this.identifierGenerator = identifierGenerator;
        this.clock = clock;
    }

    public Visitor execute(String accessToken, String cartCookie, String device, String origin) {
        Optional<SignedInVisitor> signedIn = tokenIssuer.readAccessToken(accessToken)
                .filter(this::sessionIsStillOpen);
        String cartId = cartCookie == null || cartCookie.isBlank() ? identifierGenerator.next() : cartCookie;
        return new Visitor(cartId,
                signedIn.map(SignedInVisitor::customerId).orElse(null),
                signedIn.map(SignedInVisitor::sessionId).orElse(null),
                device, origin);
    }

    private boolean sessionIsStillOpen(SignedInVisitor signedIn) {
        return sessionStore.sessionById(signedIn.sessionId())
                .filter(session -> session.isOpenAt(clock.now()))
                .filter(session -> session.customerId().equals(signedIn.customerId()))
                .map(Session::id)
                .isPresent();
    }
}
