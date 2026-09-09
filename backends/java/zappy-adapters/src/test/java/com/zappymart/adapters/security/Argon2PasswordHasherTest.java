package com.zappymart.adapters.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class Argon2PasswordHasherTest {

    private final Argon2PasswordHasher hasher = new Argon2PasswordHasher();

    @Test
    void hashesWithArgon2idAndTheParametersTheCheatSheetRecommends() {
        String hash = hasher.hash("correct horse battery staple");

        assertThat(hash).startsWith("$argon2id$v=19$m=19456,t=2,p=1$");
        assertThat(Argon2PasswordHasher.MEMORY_IN_KIBIBYTES).isEqualTo(19456);
        assertThat(Argon2PasswordHasher.ITERATIONS).isEqualTo(2);
        assertThat(Argon2PasswordHasher.PARALLELISM).isEqualTo(1);
    }

    @Test
    void neverStoresThePasswordAndSaltsEveryHash() {
        String first = hasher.hash("correct horse battery staple");
        String second = hasher.hash("correct horse battery staple");

        assertThat(first).doesNotContain("correct horse battery staple").isNotEqualTo(second);
    }

    @Test
    void matchesTheRightPasswordAndOnlyThat() {
        String hash = hasher.hash("correct horse battery staple");

        assertThat(hasher.matches("correct horse battery staple", hash)).isTrue();
        assertThat(hasher.matches("Correct horse battery staple", hash)).isFalse();
    }
}
