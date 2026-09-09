package com.zappymart.adapters.security;

import com.zappymart.application.ports.AccessToken;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.SignedInVisitor;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class JsonWebTokenIssuerTest {

    private static final Instant NOW = Instant.parse("2026-09-09T12:00:00Z");

    private final Clock clock = () -> NOW;

    private final JsonWebTokenIssuer issuer = new JsonWebTokenIssuer(clock);

    @Test
    void issuesAnAccessTokenThatReadsBackToItsCustomerAndSession() {
        AccessToken token = issuer.issueAccessToken("customer-01", "session-01");

        assertThat(token.expiresAt()).isEqualTo(NOW.plus(JsonWebTokenIssuer.ACCESS_TOKEN_LIFETIME));
        assertThat(issuer.readAccessToken(token.value()))
                .contains(new SignedInVisitor("customer-01", "session-01"));
    }

    @Test
    void readsNothingFromRubbishOrFromNothing() {
        assertThat(issuer.readAccessToken(null)).isEmpty();
        assertThat(issuer.readAccessToken("  ")).isEmpty();
        assertThat(issuer.readAccessToken("not.a.token")).isEmpty();
    }

    @Test
    void readsNothingFromATokenAnotherIssuerSigned() {
        AccessToken fromElsewhere = new JsonWebTokenIssuer(clock).issueAccessToken("customer-01", "session-01");

        assertThat(issuer.readAccessToken(fromElsewhere.value())).isEmpty();
    }

    @Test
    void makesADifferentRefreshTokenEveryTimeAndHashesItTheSameWayEveryTime() {
        String first = issuer.newRefreshToken();
        String second = issuer.newRefreshToken();

        assertThat(first).isNotEqualTo(second).hasSizeGreaterThan(20);
        assertThat(issuer.hashOfRefreshToken(first)).isEqualTo(issuer.hashOfRefreshToken(first));
        assertThat(issuer.hashOfRefreshToken(first)).isNotEqualTo(issuer.hashOfRefreshToken(second));
        assertThat(issuer.hashOfRefreshToken(first)).doesNotContain(first);
    }
}
