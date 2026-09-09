package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "sessions")
class SessionRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "customer_id", nullable = false)
    String customerId;

    @Column(name = "device", nullable = false)
    String device;

    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    @Column(name = "last_used_at", nullable = false)
    Instant lastUsedAt;

    @Column(name = "expires_at", nullable = false)
    Instant expiresAt;

    @Column(name = "revoked_at")
    Instant revokedAt;

    protected SessionRow() {
    }

    SessionRow(String id, String customerId, String device, Instant createdAt, Instant lastUsedAt,
               Instant expiresAt, Instant revokedAt) {
        this.id = id;
        this.customerId = customerId;
        this.device = device;
        this.createdAt = createdAt;
        this.lastUsedAt = lastUsedAt;
        this.expiresAt = expiresAt;
        this.revokedAt = revokedAt;
    }
}
