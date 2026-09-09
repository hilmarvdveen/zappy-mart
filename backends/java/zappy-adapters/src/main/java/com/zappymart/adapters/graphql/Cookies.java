package com.zappymart.adapters.graphql;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

public final class Cookies {

    public static final String GRAPHQL_PATH = "/graphql";

    public static final Duration LIFETIME = Duration.ofDays(30);

    private Cookies() {
    }

    public static ResponseCookie cart(String cartId, boolean secure) {
        return ResponseCookie.from(SecuritySettings.CART_COOKIE, cartId)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path("/")
                .maxAge(LIFETIME)
                .build();
    }

    public static ResponseCookie refresh(String refreshToken, boolean secure) {
        return ResponseCookie.from(SecuritySettings.REFRESH_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path(GRAPHQL_PATH)
                .maxAge(LIFETIME)
                .build();
    }

    public static ResponseCookie clearedRefresh(boolean secure) {
        return ResponseCookie.from(SecuritySettings.REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path(GRAPHQL_PATH)
                .maxAge(Duration.ZERO)
                .build();
    }
}
