package com.zappymart.adapters.security;

import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.RateLimiter;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public final class SlidingWindowRateLimiter implements RateLimiter {

    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();
    private final Clock clock;
    private final int attemptsPerWindow;
    private final Duration window;

    public SlidingWindowRateLimiter(Clock clock, int attemptsPerWindow, Duration window) {
        this.clock = clock;
        this.attemptsPerWindow = attemptsPerWindow;
        this.window = window;
    }

    @Override
    public boolean allows(String key) {
        Instant moment = clock.now();
        Deque<Instant> recent = attempts.computeIfAbsent(key, unused -> new ArrayDeque<>());
        synchronized (recent) {
            while (!recent.isEmpty() && recent.peekFirst().isBefore(moment.minus(window))) {
                recent.removeFirst();
            }
            if (recent.size() >= attemptsPerWindow) {
                return false;
            }
            recent.addLast(moment);
            return true;
        }
    }

    @Override
    public void forgetEverything() {
        attempts.clear();
    }
}
