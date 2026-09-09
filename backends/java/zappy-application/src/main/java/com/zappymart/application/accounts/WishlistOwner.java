package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;

public final class WishlistOwner {

    private WishlistOwner() {
    }

    public static String of(Visitor visitor) {
        return visitor.isSignedIn() ? visitor.customerId() : visitor.cartId();
    }
}
