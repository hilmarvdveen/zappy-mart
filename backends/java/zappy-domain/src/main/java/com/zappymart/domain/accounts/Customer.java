package com.zappymart.domain.accounts;

import com.zappymart.domain.shared.EmailAddress;

import java.time.Instant;
import java.util.Objects;

public record Customer(
        String id,
        EmailAddress email,
        String name,
        String passwordHash,
        Instant createdAt) {

    public Customer {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(email, "email");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(passwordHash, "passwordHash");
        Objects.requireNonNull(createdAt, "createdAt");
    }
}
