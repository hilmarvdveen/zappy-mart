package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
class RefreshTokenRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "session_id", nullable = false)
    String sessionId;

    @Column(name = "token_hash", nullable = false, unique = true)
    String tokenHash;

    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    Instant expiresAt;

    @Column(name = "rotated_at")
    Instant rotatedAt;

    protected RefreshTokenRow() {
    }

    RefreshTokenRow(String id, String sessionId, String tokenHash, Instant createdAt,
                    Instant expiresAt, Instant rotatedAt) {
        this.id = id;
        this.sessionId = sessionId;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.rotatedAt = rotatedAt;
    }
}
