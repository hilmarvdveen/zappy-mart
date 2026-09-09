package com.zappymart.domain.ordering;

import com.zappymart.domain.shared.Money;

public final class ShippingCharge {

    public static final Money STANDARD = Money.euro(495);

    public static final Money SUBTOTAL_THAT_CARRIES_SHIPPING = Money.euro(5000);

    private ShippingCharge() {
    }

    public static Money forCart(Money subtotal, int numberOfLines, boolean promotionCarriesShipping) {
        if (numberOfLines == 0) {
            return Money.zero();
        }
        if (promotionCarriesShipping) {
            return Money.zero();
        }
        if (subtotal.isAtLeast(SUBTOTAL_THAT_CARRIES_SHIPPING)) {
            return Money.zero();
        }
        return STANDARD;
    }
}
