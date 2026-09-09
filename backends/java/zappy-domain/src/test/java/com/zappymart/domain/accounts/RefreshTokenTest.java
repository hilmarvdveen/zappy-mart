package com.zappymart.domain.accounts;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenTest {

    private static final Instant NOW = Instant.parse("2026-09-09T12:00:00Z");

    @Test
    void aFreshTokenHasNotBeenUsedAndHasNotExpired() {
        RefreshToken token = RefreshToken.issued("token-01", "session-01", "a hash",
                NOW, NOW.plus(Duration.ofDays(30)));

        assertThat(token.wasAlreadyUsed()).isFalse();
        assertThat(token.hasExpiredAt(NOW)).isFalse();
        assertThat(token.hasExpiredAt(NOW.plus(Duration.ofDays(30)))).isTrue();
    }

    @Test
    void aRotatedTokenIsMarkedAsUsed() {
        RefreshToken token = RefreshToken.issued("token-01", "session-01", "a hash",
                NOW, NOW.plus(Duration.ofDays(30))).rotatedAt(NOW);

        assertThat(token.wasAlreadyUsed()).isTrue();
        assertThat(token.rotatedAt()).isEqualTo(NOW);
    }
}
