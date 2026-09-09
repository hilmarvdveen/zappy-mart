package com.zappymart.adapters.graphql;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SecuritySettingsTest {

    private final SecuritySettings settings = new SecuritySettings(
            List.of("http://localhost:5173", "http://localhost:3001", "http://localhost:4200"),
            true, 20, Duration.ofMinutes(1));

    @Test
    void allowsTheThreeFrontendOriginsAndNothingElse() {
        assertThat(settings.allows("http://localhost:5173")).isTrue();
        assertThat(settings.allows("http://localhost:3001")).isTrue();
        assertThat(settings.allows("http://localhost:4200")).isTrue();
        assertThat(settings.allows("https://somewhere.example")).isFalse();
    }

    @Test
    void refusesARequestWithoutAnOrigin() {
        assertThat(settings.allows(null)).isFalse();
    }

    @Test
    void namesTheTwoCookiesTheContractFixes() {
        assertThat(SecuritySettings.CART_COOKIE).isEqualTo("zappy_cart");
        assertThat(SecuritySettings.REFRESH_COOKIE).isEqualTo("zappy_refresh");
    }
}
