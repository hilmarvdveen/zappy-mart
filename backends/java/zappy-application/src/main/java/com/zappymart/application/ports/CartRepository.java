package com.zappymart.application.ports;

import com.zappymart.domain.cart.Cart;

import java.util.Optional;

public interface CartRepository {

    Optional<Cart> byId(String cartId);

    Optional<Cart> ofCustomer(String customerId);

    Cart save(Cart cart);

    void delete(String cartId);
}
