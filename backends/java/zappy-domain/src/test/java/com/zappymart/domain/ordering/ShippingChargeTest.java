package com.zappymart.domain.ordering;

import com.zappymart.domain.shared.Money;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ShippingChargeTest {

    @Test
    void anEmptyCartPaysNoShipping() {
        assertThat(ShippingCharge.forCart(Money.zero(), 0, false)).isEqualTo(Money.zero());
    }

    @Test
    void aCartBelowFiftyEuroPaysTheStandardCharge() {
        assertThat(ShippingCharge.forCart(Money.euro(4999), 1, false)).isEqualTo(Money.euro(495));
    }

    @Test
    void aCartOfFiftyEuroOrMoreCarriesItsOwnShipping() {
        assertThat(ShippingCharge.forCart(Money.euro(5000), 1, false)).isEqualTo(Money.zero());
    }

    @Test
    void aFreeShippingCodeTakesTheChargeAway() {
        assertThat(ShippingCharge.forCart(Money.euro(1970), 1, true)).isEqualTo(Money.zero());
    }
}
