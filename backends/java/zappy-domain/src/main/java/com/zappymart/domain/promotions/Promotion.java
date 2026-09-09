package com.zappymart.domain.promotions;

import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

public record Promotion(
        PromotionCode code,
        PromotionRule rule,
        Money minimumSubtotal,
        Instant validFrom,
        Instant validUntil,
        Integer usageLimit,
        int timesUsed) {

    public Promotion {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(rule, "rule");
        Objects.requireNonNull(validFrom, "validFrom");
        Objects.requireNonNull(validUntil, "validUntil");
        if (timesUsed < 0) {
            throw new IllegalArgumentException("A use count is never negative: " + timesUsed);
        }
    }

    public Result<AppliedPromotion> applyTo(Money subtotal, Instant moment) {
        if (moment.isBefore(validFrom) || moment.isAfter(validUntil)) {
            return Result.refuse(UserErrorCode.CODE_EXPIRED,
                    "The promotion code " + code + " is outside its validity window.", "code");
        }
        if (isExhausted()) {
            return Result.refuse(UserErrorCode.CODE_EXHAUSTED,
                    "The promotion code " + code + " has reached its usage limit.", "code");
        }
        if (minimumSubtotal != null && subtotal.isLessThan(minimumSubtotal)) {
            return Result.refuse(UserErrorCode.CODE_MINIMUM_NOT_MET,
                    "The promotion code " + code + " asks for a subtotal of at least "
                            + minimumSubtotal.amount() + " cents.", "code");
        }
        return Result.of(new AppliedPromotion(code.value(), rule.kind(), rule.discountFor(subtotal),
                rule.carriesShipping()));
    }

    public boolean isExhausted() {
        return usageLimit != null && timesUsed >= usageLimit;
    }

    public Promotion afterOneMoreUse() {
        return new Promotion(code, rule, minimumSubtotal, validFrom, validUntil, usageLimit, timesUsed + 1);
    }

    public Optional<Money> minimum() {
        return Optional.ofNullable(minimumSubtotal);
    }
}
