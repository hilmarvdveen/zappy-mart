package com.zappymart.domain.shared;

import java.util.Objects;

public record UserError(UserErrorCode code, String message, String field) {

    public UserError {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(message, "message");
    }

    public static UserError of(UserErrorCode code, String message) {
        return new UserError(code, message, null);
    }

    public static UserError onField(UserErrorCode code, String message, String field) {
        return new UserError(code, message, field);
    }
}
