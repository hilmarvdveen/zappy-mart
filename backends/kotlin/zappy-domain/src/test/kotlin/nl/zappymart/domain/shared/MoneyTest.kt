package nl.zappymart.domain.shared

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class MoneyTest {

    @Test
    fun `adds and subtracts amounts in the same currency`() {
        assertThat(Money.euro(1970) + Money.euro(495)).isEqualTo(Money.euro(2465))
        assertThat(Money.euro(2465) - Money.euro(495)).isEqualTo(Money.euro(1970))
    }

    @Test
    fun `multiplies a price by a quantity`() {
        assertThat(Money.euro(985) * 2).isEqualTo(Money.euro(1970))
    }

    @Test
    fun `rounds a percentage half up to whole cents`() {
        assertThat(Money.euro(5599).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(560))
        assertThat(Money.euro(1970).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(197))
        assertThat(Money.euro(5).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(1))
    }

    @Test
    fun `caps an amount at a maximum`() {
        assertThat(Money.euro(500).cappedAt(Money.euro(300))).isEqualTo(Money.euro(300))
        assertThat(Money.euro(200).cappedAt(Money.euro(300))).isEqualTo(Money.euro(200))
    }

    @Test
    fun `refuses to combine two currencies`() {
        assertThatThrownBy { Money.euro(100) + Money(100, "USD") }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `refuses a negative amount`() {
        assertThatThrownBy { Money.euro(-1) }.isInstanceOf(IllegalArgumentException::class.java)
    }
}
