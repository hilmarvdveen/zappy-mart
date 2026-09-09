package nl.zappymart.domain.promotions

import java.time.Instant
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class Promotion(
    val code: PromotionCode,
    val rule: PromotionRule,
    val minimumSubtotal: Money?,
    val validFrom: Instant,
    val validUntil: Instant,
    val usageLimit: Int?,
    val timesUsed: Int,
) {

    fun applyTo(subtotal: Money, moment: Instant): Result<AppliedPromotion> = when {
        moment.isBefore(validFrom) || moment.isAfter(validUntil) ->
            refusal(UserErrorCode.CODE_EXPIRED, "The code ${code.value} is outside its validity window.", "code")

        usageLimit != null && timesUsed >= usageLimit ->
            refusal(UserErrorCode.CODE_EXHAUSTED, "The code ${code.value} has reached its usage limit.", "code")

        minimumSubtotal != null && subtotal < minimumSubtotal ->
            refusal(
                UserErrorCode.CODE_MINIMUM_NOT_MET,
                "The code ${code.value} needs a subtotal of at least ${minimumSubtotal.amount} cents.",
                "code",
            )

        else -> Result.Success(AppliedPromotion(code, rule.kind, rule.discountFor(subtotal)))
    }

    fun usedOnce() = copy(timesUsed = timesUsed + 1)
}
