package com.zappymart.domain.accounts;

import java.time.Instant;
import java.util.Objects;

public record Session(
        String id,
        String customerId,
        String device,
        Instant createdAt,
        Instant lastUsedAt,
        Instant expiresAt,
        Instant revokedAt) {

    public Session {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(customerId, "customerId");
        Objects.requireNonNull(device, "device");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(lastUsedAt, "lastUsedAt");
        Objects.requireNonNull(expiresAt, "expiresAt");
    }

    public static Session opened(String id, String customerId, String device, Instant moment, Instant expiresAt) {
        return new Session(id, customerId, device, moment, moment, expiresAt, null);
    }

    public boolean isOpenAt(Instant moment) {
        return revokedAt == null && moment.isBefore(expiresAt);
    }

    public Session usedAt(Instant moment) {
        return new Session(id, customerId, device, createdAt, moment, expiresAt, revokedAt);
    }

    public Session revokedAt(Instant moment) {
        return new Session(id, customerId, device, createdAt, lastUsedAt, expiresAt, moment);
    }
}
