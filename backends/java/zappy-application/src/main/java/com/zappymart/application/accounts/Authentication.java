package com.zappymart.application.accounts;

import com.zappymart.application.ports.AccessToken;
import com.zappymart.domain.accounts.Customer;

public record Authentication(Customer customer, AccessToken accessToken, String refreshToken, String sessionId) {
}
