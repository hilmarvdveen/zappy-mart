package com.zappymart.domain.promotions;

import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserError;
import com.zappymart.domain.shared.UserErrorCode;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PromotionTest {

    private static final Instant TODAY = Instant.parse("2026-09-09T12:00:00Z");
    private static final Instant OPENS = Instant.parse("2026-01-01T00:00:00Z");
    private static final Instant CLOSES = Instant.parse("2027-12-31T23:59:59Z");

    @Test
    void aPercentageCodeTakesItsShareOfTheSubtotal() {
        Promotion welcome = percentage("WELCOME10", 10, null, OPENS, CLOSES, null, 0);

        AppliedPromotion applied = welcome.applyTo(Money.euro(5599), TODAY).valueOrThrow();

        assertThat(applied.code()).isEqualTo("WELCOME10");
        assertThat(applied.kind()).isEqualTo(PromotionKind.PERCENTAGE);
        assertThat(applied.discount()).isEqualTo(Money.euro(560));
    }

    @Test
    void aCodeOutsideItsWindowIsExpired() {
        Promotion summer = percentage("SUMMER2025", 10, null,
                Instant.parse("2025-06-01T00:00:00Z"), Instant.parse("2025-08-31T23:59:59Z"), null, 0);

        assertThat(reasonOf(summer.applyTo(Money.euro(5599), TODAY))).isEqualTo(UserErrorCode.CODE_EXPIRED);
    }

    @Test
    void aCodeAtItsLimitIsExhausted() {
        Promotion once = percentage("ONCE", 10, null, OPENS, CLOSES, 1, 1);

        assertThat(once.isExhausted()).isTrue();
        assertThat(reasonOf(once.applyTo(Money.euro(5599), TODAY))).isEqualTo(UserErrorCode.CODE_EXHAUSTED);
    }

    @Test
    void aCodeBelowItsMinimumSubtotalIsRefused() {
        Promotion fiveOff = new Promotion(new PromotionCode("FIVEOFF"),
                new PromotionRule.FixedAmountOff(Money.euro(500)), Money.euro(2500), OPENS, CLOSES, null, 0);

        assertThat(reasonOf(fiveOff.applyTo(Money.euro(1970), TODAY)))
                .isEqualTo(UserErrorCode.CODE_MINIMUM_NOT_MET);
        assertThat(fiveOff.applyTo(Money.euro(2500), TODAY).valueOrThrow().discount())
                .isEqualTo(Money.euro(500));
    }

    @Test
    void aFreeShippingCodeDiscountsNothingAndCarriesTheShipping() {
        Promotion freeShipping = new Promotion(new PromotionCode("FREESHIP"),
                new PromotionRule.FreeShipping(), null, OPENS, CLOSES, null, 0);

        AppliedPromotion applied = freeShipping.applyTo(Money.euro(1970), TODAY).valueOrThrow();

        assertThat(applied.discount()).isEqualTo(Money.zero());
        assertThat(applied.carriesShipping()).isTrue();
    }

    @Test
    void countsOneMoreUse() {
        Promotion once = percentage("ONCE", 10, null, OPENS, CLOSES, 2, 0);

        assertThat(once.afterOneMoreUse().timesUsed()).isEqualTo(1);
        assertThat(once.minimum()).isEmpty();
    }

    private static Promotion percentage(String code, int percentage, Money minimumSubtotal,
                                        Instant from, Instant until, Integer limit, int used) {
        return new Promotion(new PromotionCode(code), new PromotionRule.PercentageOff(percentage),
                minimumSubtotal, from, until, limit, used);
    }

    private static UserErrorCode reasonOf(Result<AppliedPromotion> result) {
        return result.errors().stream().map(UserError::code).findFirst().orElseThrow();
    }
}
