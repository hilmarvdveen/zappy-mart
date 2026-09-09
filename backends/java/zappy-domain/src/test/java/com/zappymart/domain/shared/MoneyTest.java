package com.zappymart.domain.shared;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

    @Test
    void addsAndSubtractsWithinOneCurrency() {
        assertThat(Money.euro(1970).plus(Money.euro(495))).isEqualTo(Money.euro(2465));
        assertThat(Money.euro(2465).minus(Money.euro(495))).isEqualTo(Money.euro(1970));
    }

    @Test
    void multipliesByAQuantity() {
        assertThat(Money.euro(985).times(2)).isEqualTo(Money.euro(1970));
    }

    @Test
    void roundsAPercentageHalfUpToWholeCents() {
        assertThat(Money.euro(5599).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(560));
        assertThat(Money.euro(5595).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(560));
        assertThat(Money.euro(5594).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(559));
    }

    @Test
    void capsAnAmountAtACeiling() {
        assertThat(Money.euro(500).cappedAt(Money.euro(300))).isEqualTo(Money.euro(300));
        assertThat(Money.euro(200).cappedAt(Money.euro(300))).isEqualTo(Money.euro(200));
    }

    @Test
    void refusesANegativeAmount() {
        assertThatThrownBy(() -> Money.euro(-1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void refusesToMixCurrencies() {
        assertThatThrownBy(() -> Money.euro(100).plus(new Money(100, "USD")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
