package nl.zappymart.domain.shared

import java.math.BigDecimal
import java.math.RoundingMode

data class Money(val amount: Int, val currency: String) : Comparable<Money> {

    init {
        require(amount >= 0) { "An amount of money is never negative, and $amount is" }
        require(currency.length == 3) { "A currency is an ISO 4217 code of three letters, and $currency is not" }
    }

    operator fun plus(other: Money): Money {
        requireTheSameCurrencyAs(other)
        return Money(amount + other.amount, currency)
    }

    operator fun minus(other: Money): Money {
        requireTheSameCurrencyAs(other)
        return Money(amount - other.amount, currency)
    }

    operator fun times(count: Int): Money = Money(amount * count, currency)

    override fun compareTo(other: Money): Int {
        requireTheSameCurrencyAs(other)
        return amount.compareTo(other.amount)
    }

    fun percentageRoundedHalfUp(percentage: Int): Money {
        val discounted = BigDecimal(amount)
            .multiply(BigDecimal(percentage))
            .divide(BigDecimal(100), 0, RoundingMode.HALF_UP)
        return Money(discounted.toInt(), currency)
    }

    fun cappedAt(maximum: Money): Money = if (this > maximum) maximum else this

    private fun requireTheSameCurrencyAs(other: Money) =
        require(currency == other.currency) {
            "Two amounts of money in $currency and ${other.currency} cannot be combined"
        }

    companion object {
        const val EURO = "EUR"

        val NOTHING = Money(0, EURO)

        fun euro(amount: Int) = Money(amount, EURO)
    }
}
