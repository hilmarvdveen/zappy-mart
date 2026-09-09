package com.zappymart.adapters.graphql;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class CookiesTest {

    @Test
    void theCartCookieIsReadableByNoScriptAndTravelsWithEveryPath() {
        ResponseCookie cookie = Cookies.cart("cart-01", true);

        assertThat(cookie.getName()).isEqualTo("zappy_cart");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Lax");
        assertThat(cookie.getPath()).isEqualTo("/");
    }

    @Test
    void theRefreshCookieIsLimitedToTheGraphQlEndpoint() {
        ResponseCookie cookie = Cookies.refresh("a-refresh-token", true);

        assertThat(cookie.getName()).isEqualTo("zappy_refresh");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/graphql");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofDays(30));
    }

    @Test
    void clearingTheRefreshCookieEmptiesItAndEndsItNow() {
        ResponseCookie cookie = Cookies.clearedRefresh(false);

        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge()).isZero();
        assertThat(cookie.isSecure()).isFalse();
    }
}
