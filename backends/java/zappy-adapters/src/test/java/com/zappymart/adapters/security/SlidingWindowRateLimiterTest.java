package com.zappymart.adapters.security;

import com.zappymart.application.ports.Clock;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class SlidingWindowRateLimiterTest {

    private final AtomicReference<Instant> moment =
            new AtomicReference<>(Instant.parse("2026-09-09T12:00:00Z"));

    private final Clock clock = moment::get;

    private final SlidingWindowRateLimiter limiter =
            new SlidingWindowRateLimiter(clock, 3, Duration.ofMinutes(1));

    @Test
    void allowsTheAttemptsInsideTheWindowAndRefusesTheOneAfterThem() {
        assertThat(limiter.allows("login:jane@example.com")).isTrue();
        assertThat(limiter.allows("login:jane@example.com")).isTrue();
        assertThat(limiter.allows("login:jane@example.com")).isTrue();
        assertThat(limiter.allows("login:jane@example.com")).isFalse();
    }

    @Test
    void countsEveryKeyOnItsOwn() {
        limiter.allows("login:jane@example.com");
        limiter.allows("login:jane@example.com");
        limiter.allows("login:jane@example.com");

        assertThat(limiter.allows("login:someone@example.com")).isTrue();
    }

    @Test
    void forgetsAttemptsThatFellOutOfTheWindow() {
        limiter.allows("login:jane@example.com");
        limiter.allows("login:jane@example.com");
        limiter.allows("login:jane@example.com");

        moment.set(moment.get().plus(Duration.ofMinutes(2)));

        assertThat(limiter.allows("login:jane@example.com")).isTrue();
    }

    @Test
    void forgetsEverythingWhenTheSeedIsLoadedAgain() {
        limiter.allows("login:jane@example.com");
        limiter.allows("login:jane@example.com");
        limiter.allows("login:jane@example.com");

        limiter.forgetEverything();

        assertThat(limiter.allows("login:jane@example.com")).isTrue();
    }
}
