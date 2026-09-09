package com.zappymart.adapters.graphql;

import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.shared.UserError;

import java.time.Instant;
import java.util.List;

public record AuthenticationPayload(
        Customer customer,
        String accessToken,
        Instant accessTokenExpiresAt,
        List<UserError> errors) {

    public static AuthenticationPayload refused(List<UserError> errors) {
        return new AuthenticationPayload(null, null, null, errors);
    }
}
