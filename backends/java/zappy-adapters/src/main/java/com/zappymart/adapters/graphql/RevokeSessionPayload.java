package com.zappymart.adapters.graphql;

import com.zappymart.domain.accounts.Session;
import com.zappymart.domain.shared.UserError;

import java.util.List;

public record RevokeSessionPayload(List<Session> sessions, List<UserError> errors) {
}
