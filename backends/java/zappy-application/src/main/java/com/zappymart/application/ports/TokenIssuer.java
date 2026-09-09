package com.zappymart.application.ports;

import java.util.Optional;

public interface TokenIssuer {

    AccessToken issueAccessToken(String customerId, String sessionId);

    Optional<SignedInVisitor> readAccessToken(String token);

    String newRefreshToken();

    String hashOfRefreshToken(String refreshToken);
}
