package com.zappymart.adapters.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import com.zappymart.application.ports.AccessToken;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.SignedInVisitor;
import com.zappymart.application.ports.TokenIssuer;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

public final class JsonWebTokenIssuer implements TokenIssuer {

    public static final Duration ACCESS_TOKEN_LIFETIME = Duration.ofMinutes(15);

    public static final String ISSUER = "https://zappy-mart.example/java";

    public static final String SESSION_CLAIM = "sessionId";

    private static final int REFRESH_TOKEN_LENGTH_IN_BYTES = 32;

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public JsonWebTokenIssuer(Clock clock) {
        this.clock = clock;
        RSAKey signingKey = generateSigningKey();
        this.encoder = new NimbusJwtEncoder(new ImmutableJWKSet<SecurityContext>(new JWKSet(signingKey)));
        this.decoder = NimbusJwtDecoder.withPublicKey(publicKeyOf(signingKey))
                .signatureAlgorithm(SignatureAlgorithm.RS256)
                .build();
    }

    @Override
    public AccessToken issueAccessToken(String customerId, String sessionId) {
        Instant issuedAt = clock.now();
        Instant expiresAt = issuedAt.plus(ACCESS_TOKEN_LIFETIME);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(customerId)
                .claim(SESSION_CLAIM, sessionId)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .build();
        Jwt signed = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(), claims));
        return new AccessToken(signed.getTokenValue(), expiresAt);
    }

    @Override
    public Optional<SignedInVisitor> readAccessToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Jwt jwt = decoder.decode(token);
            String customerId = jwt.getSubject();
            String sessionId = jwt.getClaimAsString(SESSION_CLAIM);
            if (customerId == null || sessionId == null) {
                return Optional.empty();
            }
            return Optional.of(new SignedInVisitor(customerId, sessionId));
        } catch (JwtException unreadable) {
            return Optional.empty();
        }
    }

    @Override
    public String newRefreshToken() {
        byte[] material = new byte[REFRESH_TOKEN_LENGTH_IN_BYTES];
        secureRandom.nextBytes(material);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(material);
    }

    @Override
    public String hashOfRefreshToken(String refreshToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(refreshToken.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("This runtime has no SHA-256", impossible);
        }
    }

    private static RSAKey generateSigningKey() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair pair = generator.generateKeyPair();
            return new RSAKey.Builder((RSAPublicKey) pair.getPublic())
                    .privateKey((RSAPrivateKey) pair.getPrivate())
                    .keyID(UUID.randomUUID().toString())
                    .build();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("This runtime has no RSA", impossible);
        }
    }

    private static RSAPublicKey publicKeyOf(RSAKey signingKey) {
        try {
            return signingKey.toRSAPublicKey();
        } catch (Exception unusable) {
            throw new IllegalStateException("The generated signing key has no usable public half", unusable);
        }
    }
}
