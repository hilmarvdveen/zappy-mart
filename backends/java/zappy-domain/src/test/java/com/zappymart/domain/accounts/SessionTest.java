package com.zappymart.domain.accounts;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class SessionTest {

    private static final Instant NOW = Instant.parse("2026-09-09T12:00:00Z");

    @Test
    void anOpenedSessionStaysOpenUntilItExpires() {
        Session session = Session.opened("session-01", "customer-01", "Chrome on Windows",
                NOW, NOW.plus(Duration.ofDays(30)));

        assertThat(session.isOpenAt(NOW)).isTrue();
        assertThat(session.isOpenAt(NOW.plus(Duration.ofDays(31)))).isFalse();
    }

    @Test
    void aRevokedSessionIsClosedAtOnce() {
        Session session = Session.opened("session-01", "customer-01", "Chrome on Windows",
                NOW, NOW.plus(Duration.ofDays(30))).revokedAt(NOW);

        assertThat(session.isOpenAt(NOW)).isFalse();
    }

    @Test
    void recordsWhenItWasLastUsed() {
        Instant later = NOW.plus(Duration.ofHours(2));
        Session session = Session.opened("session-01", "customer-01", "Chrome on Windows",
                NOW, NOW.plus(Duration.ofDays(30))).usedAt(later);

        assertThat(session.lastUsedAt()).isEqualTo(later);
        assertThat(session.createdAt()).isEqualTo(NOW);
    }
}
