package com.zappymart.domain.promotions;

import com.zappymart.domain.shared.Money;

public sealed interface PromotionRule {

    PromotionKind kind();

    Money discountFor(Money subtotal);

    boolean carriesShipping();

    record PercentageOff(int percentage) implements PromotionRule {
        public PercentageOff {
            if (percentage < 1 || percentage > 100) {
                throw new IllegalArgumentException("A percentage code takes between 1 and 100 percent: " + percentage);
            }
        }

        @Override
        public PromotionKind kind() {
            return PromotionKind.PERCENTAGE;
        }

        @Override
        public Money discountFor(Money subtotal) {
            return subtotal.percentageRoundedHalfUp(percentage);
        }

        @Override
        public boolean carriesShipping() {
            return false;
        }
    }

    record FixedAmountOff(Money amount) implements PromotionRule {
        public FixedAmountOff {
            if (amount.isZero()) {
                throw new IllegalArgumentException("A fixed amount code takes more than nothing off");
            }
        }

        @Override
        public PromotionKind kind() {
            return PromotionKind.FIXED_AMOUNT;
        }

        @Override
        public Money discountFor(Money subtotal) {
            return amount.cappedAt(subtotal);
        }

        @Override
        public boolean carriesShipping() {
            return false;
        }
    }

    record FreeShipping() implements PromotionRule {
        @Override
        public PromotionKind kind() {
            return PromotionKind.FREE_SHIPPING;
        }

        @Override
        public Money discountFor(Money subtotal) {
            return Money.zero();
        }

        @Override
        public boolean carriesShipping() {
            return true;
        }
    }
}
