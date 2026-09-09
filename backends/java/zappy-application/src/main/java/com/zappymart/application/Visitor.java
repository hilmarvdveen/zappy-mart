package com.zappymart.application;

public record Visitor(String cartId, String customerId, String sessionId, String device, String origin) {

    public static Visitor anonymous() {
        return new Visitor(null, null, null, null, null);
    }

    public boolean isSignedIn() {
        return customerId != null;
    }
}
