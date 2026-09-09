package com.zappymart.application.promotions;

import com.zappymart.application.Visitor;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.PromotionRepository;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.promotions.AppliedPromotion;
import com.zappymart.domain.promotions.Promotion;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.util.Optional;

public final class ApplyPromotionCode {

    private final UnitOfWork unitOfWork;
    private final CurrentCart currentCart;
    private final CartRepository cartRepository;
    private final PromotionRepository promotionRepository;
    private final Clock clock;

    public ApplyPromotionCode(UnitOfWork unitOfWork, CurrentCart currentCart, CartRepository cartRepository,
                              PromotionRepository promotionRepository, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.currentCart = currentCart;
        this.cartRepository = cartRepository;
        this.promotionRepository = promotionRepository;
        this.clock = clock;
    }

    public Result<Cart> execute(Visitor visitor, String typedCode) {
        return unitOfWork.inTransaction(() -> {
            Optional<PromotionCode> code = PromotionCode.parse(typedCode);
            if (code.isEmpty()) {
                return unknownCode(typedCode);
            }
            Optional<Promotion> promotion = promotionRepository.byCode(code.get());
            if (promotion.isEmpty()) {
                return unknownCode(code.get().value());
            }
            Cart cart = currentCart.forVisitor(visitor);
            Result<AppliedPromotion> applied = promotion.get().applyTo(cart.subtotal(), clock.now());
            if (!applied.succeeded()) {
                return applied.carryRefusal();
            }
            Cart changed = cart.withPromotion(code.get(), promotion.get().rule(), clock.now());
            return Result.of(cartRepository.save(changed));
        });
    }

    private Result<Cart> unknownCode(String typedCode) {
        return Result.refuse(UserErrorCode.CODE_UNKNOWN, "No promotion code reads " + typedCode + ".", "code");
    }
}
