package nl.zappymart.domain.promotions

import nl.zappymart.domain.shared.Money

sealed interface PromotionRule {

    val kind: PromotionKind

    fun discountFor(subtotal: Money): Money

    data class Percentage(val percentage: Int) : PromotionRule {

        init {
            require(percentage in 1..100) { "A percentage code takes between 1 and 100 percent, not $percentage" }
        }

        override val kind = PromotionKind.PERCENTAGE

        override fun discountFor(subtotal: Money) = subtotal.percentageRoundedHalfUp(percentage)
    }

    data class FixedAmount(val amount: Money) : PromotionRule {

        override val kind = PromotionKind.FIXED_AMOUNT

        override fun discountFor(subtotal: Money) = amount.cappedAt(subtotal)
    }

    data object FreeShipping : PromotionRule {

        override val kind = PromotionKind.FREE_SHIPPING

        override fun discountFor(subtotal: Money) = Money(0, subtotal.currency)
    }
}
