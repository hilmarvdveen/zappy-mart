package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "customers")
class CustomerRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "email", nullable = false, unique = true)
    String email;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "password_hash", nullable = false)
    String passwordHash;

    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    protected CustomerRow() {
    }

    CustomerRow(String id, String email, String name, String passwordHash, Instant createdAt) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }
}
