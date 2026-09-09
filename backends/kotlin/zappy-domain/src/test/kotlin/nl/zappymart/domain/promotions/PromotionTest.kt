package nl.zappymart.domain.promotions

import java.time.Instant
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class PromotionTest {

    private val today: Instant = Instant.parse("2026-09-09T10:00:00Z")

    private fun promotion(
        code: String,
        rule: PromotionRule,
        minimumSubtotal: Money? = null,
        validFrom: String = "2026-01-01T00:00:00Z",
        validUntil: String = "2027-12-31T23:59:59Z",
        usageLimit: Int? = null,
        timesUsed: Int = 0,
    ) = Promotion(
        PromotionCode.of(code),
        rule,
        minimumSubtotal,
        Instant.parse(validFrom),
        Instant.parse(validUntil),
        usageLimit,
        timesUsed,
    )

    @Test
    fun `a percentage code takes its percentage of the subtotal rounded half up`() {
        val applied = promotion("WELCOME10", PromotionRule.Percentage(10))
            .applyTo(Money.euro(5599), today) as Result.Success
        assertThat(applied.value.kind).isEqualTo(PromotionKind.PERCENTAGE)
        assertThat(applied.value.discount).isEqualTo(Money.euro(560))
    }

    @Test
    fun `a fixed amount code never discounts more than the subtotal`() {
        val applied = promotion("FIVEOFF", PromotionRule.FixedAmount(Money.euro(500)))
            .applyTo(Money.euro(300), today) as Result.Success
        assertThat(applied.value.discount).isEqualTo(Money.euro(300))
    }

    @Test
    fun `a free shipping code discounts nothing`() {
        val applied = promotion("FREESHIP", PromotionRule.FreeShipping)
            .applyTo(Money.euro(1970), today) as Result.Success
        assertThat(applied.value.kind).isEqualTo(PromotionKind.FREE_SHIPPING)
        assertThat(applied.value.discount).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `a code outside its window is expired`() {
        val refused = promotion(
            "SUMMER2025",
            PromotionRule.Percentage(10),
            validFrom = "2025-06-01T00:00:00Z",
            validUntil = "2025-08-31T23:59:59Z",
        ).applyTo(Money.euro(1970), today) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_EXPIRED)
    }

    @Test
    fun `a code at its usage limit is exhausted`() {
        val refused = promotion("ONCE", PromotionRule.Percentage(10), usageLimit = 1, timesUsed = 1)
            .applyTo(Money.euro(1970), today) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_EXHAUSTED)
    }

    @Test
    fun `a code below its minimum subtotal is refused`() {
        val refused = promotion(
            "FIVEOFF",
            PromotionRule.FixedAmount(Money.euro(500)),
            minimumSubtotal = Money.euro(2500),
        ).applyTo(Money.euro(1970), today) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_MINIMUM_NOT_MET)
    }

    @Test
    fun `counting a use raises the recorded number`() {
        assertThat(promotion("ONCE", PromotionRule.Percentage(10)).usedOnce().timesUsed).isEqualTo(1)
    }
}
