package com.zappymart.application.cart;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.shared.Result;

public final class ChangeCartLineQuantity {

    private final UnitOfWork unitOfWork;
    private final CurrentCart currentCart;
    private final CartRepository cartRepository;
    private final Clock clock;

    public ChangeCartLineQuantity(UnitOfWork unitOfWork, CurrentCart currentCart,
                                  CartRepository cartRepository, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.currentCart = currentCart;
        this.cartRepository = cartRepository;
        this.clock = clock;
    }

    public Result<Cart> execute(Visitor visitor, String lineId, int quantity) {
        return unitOfWork.inTransaction(() -> {
            Cart cart = currentCart.forVisitor(visitor);
            return cart.changeLineQuantity(lineId, quantity, clock.now()).map(cartRepository::save);
        });
    }
}
