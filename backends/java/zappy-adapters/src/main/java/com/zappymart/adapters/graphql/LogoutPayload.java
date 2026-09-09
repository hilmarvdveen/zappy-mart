package com.zappymart.adapters.graphql;

import com.zappymart.domain.shared.UserError;

import java.util.List;

public record LogoutPayload(boolean success, List<UserError> errors) {
}
