package com.zappymart.adapters.security;

import com.zappymart.application.ports.PasswordHasher;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

public final class Argon2PasswordHasher implements PasswordHasher {

    public static final int SALT_LENGTH_IN_BYTES = 16;

    public static final int HASH_LENGTH_IN_BYTES = 32;

    public static final int PARALLELISM = 1;

    public static final int MEMORY_IN_KIBIBYTES = 19456;

    public static final int ITERATIONS = 2;

    private final Argon2PasswordEncoder encoder = new Argon2PasswordEncoder(
            SALT_LENGTH_IN_BYTES, HASH_LENGTH_IN_BYTES, PARALLELISM, MEMORY_IN_KIBIBYTES, ITERATIONS);

    @Override
    public String hash(String password) {
        return encoder.encode(password);
    }

    @Override
    public boolean matches(String password, String storedHash) {
        return encoder.matches(password, storedHash);
    }
}
