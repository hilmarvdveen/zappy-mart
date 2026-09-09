package com.zappymart.application.cart;

import com.zappymart.application.Visitor;
import com.zappymart.domain.cart.Cart;

public final class ViewCart {

    private final CurrentCart currentCart;

    public ViewCart(CurrentCart currentCart) {
        this.currentCart = currentCart;
    }

    public Cart execute(Visitor visitor) {
        return currentCart.forVisitor(visitor);
    }
}
