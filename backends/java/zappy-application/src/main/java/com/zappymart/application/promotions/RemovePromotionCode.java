package com.zappymart.application.promotions;

import com.zappymart.application.Visitor;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.shared.Result;

public final class RemovePromotionCode {

    private final UnitOfWork unitOfWork;
    private final CurrentCart currentCart;
    private final CartRepository cartRepository;
    private final Clock clock;

    public RemovePromotionCode(UnitOfWork unitOfWork, CurrentCart currentCart,
                               CartRepository cartRepository, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.currentCart = currentCart;
        this.cartRepository = cartRepository;
        this.clock = clock;
    }

    public Result<Cart> execute(Visitor visitor) {
        return unitOfWork.inTransaction(() -> {
            Cart cart = currentCart.forVisitor(visitor);
            if (cart.promotionCode() == null) {
                return Result.of(cart);
            }
            return Result.of(cartRepository.save(cart.withoutPromotion(clock.now())));
        });
    }
}
