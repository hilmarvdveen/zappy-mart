package com.zappymart.domain.promotions;

import com.zappymart.domain.shared.Money;

import java.util.Objects;

public record AppliedPromotion(String code, PromotionKind kind, Money discount, boolean carriesShipping) {

    public AppliedPromotion {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(discount, "discount");
    }
}
