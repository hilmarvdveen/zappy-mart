package com.zappymart.application.accounts;

import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.domain.accounts.Session;

import java.util.List;

public final class ListOpenSessions {

    private final SessionStore sessionStore;
    private final Clock clock;

    public ListOpenSessions(SessionStore sessionStore, Clock clock) {
        this.sessionStore = sessionStore;
        this.clock = clock;
    }

    public List<Session> execute(String customerId) {
        return sessionStore.openSessionsOf(customerId, clock.now());
    }
}
