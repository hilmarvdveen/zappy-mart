package com.zappymart.adapters.graphql;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties("zappy.security")
public record SecuritySettings(
        @DefaultValue({"http://localhost:5173", "http://localhost:3001", "http://localhost:4200"})
        List<String> allowedOrigins,
        @DefaultValue("true") boolean cookiesAreSecure,
        @DefaultValue("20") int attemptsPerWindow,
        @DefaultValue("PT1M") Duration window) {

    public static final String REFRESH_COOKIE = "zappy_refresh";

    public static final String CART_COOKIE = "zappy_cart";

    public boolean allows(String origin) {
        return origin != null && allowedOrigins.contains(origin);
    }
}
