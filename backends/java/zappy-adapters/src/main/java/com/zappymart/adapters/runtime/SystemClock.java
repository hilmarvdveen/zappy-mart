package com.zappymart.adapters.runtime;

import com.zappymart.application.ports.Clock;

import java.time.Instant;

public final class SystemClock implements Clock {

    @Override
    public Instant now() {
        return Instant.now();
    }
}
