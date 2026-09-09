package com.zappymart.application.ports;

import java.time.Instant;

public record AccessToken(String value, Instant expiresAt) {
}
