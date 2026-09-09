package com.zappymart.adapters.graphql;

import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.shared.UserError;

import java.util.List;

public record CartPayload(Cart cart, Integer availableStock, List<UserError> errors) {
}
