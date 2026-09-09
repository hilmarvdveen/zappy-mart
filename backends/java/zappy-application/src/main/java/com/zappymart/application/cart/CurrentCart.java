package com.zappymart.application.cart;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.domain.cart.Cart;

import java.util.Optional;

public final class CurrentCart {

    private final CartRepository cartRepository;
    private final IdentifierGenerator identifierGenerator;
    private final Clock clock;

    public CurrentCart(CartRepository cartRepository, IdentifierGenerator identifierGenerator, Clock clock) {
        this.cartRepository = cartRepository;
        this.identifierGenerator = identifierGenerator;
        this.clock = clock;
    }

    public Cart forVisitor(Visitor visitor) {
        if (visitor.isSignedIn()) {
            return cartRepository.ofCustomer(visitor.customerId())
                    .orElseGet(() -> Cart.empty(identifierGenerator.next(), visitor.customerId(), clock.now()));
        }
        return anonymousCart(visitor)
                .orElseGet(() -> Cart.empty(anonymousIdentityOf(visitor), null, clock.now()));
    }

    public Optional<Cart> anonymousCart(Visitor visitor) {
        if (visitor.cartId() == null) {
            return Optional.empty();
        }
        return cartRepository.byId(visitor.cartId()).filter(cart -> cart.customerId() == null);
    }

    private String anonymousIdentityOf(Visitor visitor) {
        return visitor.cartId() == null ? identifierGenerator.next() : visitor.cartId();
    }
}
