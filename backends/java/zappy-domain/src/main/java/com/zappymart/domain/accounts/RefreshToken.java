package com.zappymart.domain.accounts;

import java.time.Instant;
import java.util.Objects;

public record RefreshToken(
        String id,
        String sessionId,
        String tokenHash,
        Instant createdAt,
        Instant expiresAt,
        Instant rotatedAt) {

    public RefreshToken {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(sessionId, "sessionId");
        Objects.requireNonNull(tokenHash, "tokenHash");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(expiresAt, "expiresAt");
    }

    public static RefreshToken issued(String id, String sessionId, String tokenHash,
                                      Instant moment, Instant expiresAt) {
        return new RefreshToken(id, sessionId, tokenHash, moment, expiresAt, null);
    }

    public boolean wasAlreadyUsed() {
        return rotatedAt != null;
    }

    public boolean hasExpiredAt(Instant moment) {
        return !moment.isBefore(expiresAt);
    }

    public RefreshToken rotatedAt(Instant moment) {
        return new RefreshToken(id, sessionId, tokenHash, createdAt, expiresAt, moment);
    }
}
