package nl.zappymart.domain.cart

import java.time.Instant
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.promotions.AppliedPromotion
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class Cart(
    val id: String,
    val customerId: String?,
    val lines: List<CartLine>,
    val promotionCode: PromotionCode?,
    val promotion: AppliedPromotion?,
    val updatedAt: Instant,
) {

    val subtotal: Money
        get() = lines.fold(Money.NOTHING) { runningTotal, line -> runningTotal + line.lineTotal }

    val shipping: Money get() = Shipping.forSubtotal(subtotal, promotion, lines.isNotEmpty())

    val discount: Money get() = promotion?.discount ?: Money.NOTHING

    val total: Money get() = subtotal + shipping - discount

    val isEmpty: Boolean get() = lines.isEmpty()

    fun lineFor(productId: String): CartLine? = lines.firstOrNull { line -> line.product.id == productId }

    fun withProductAdded(product: Product, quantity: Int, newLineId: String, moment: Instant): Result<Cart> {
        if (quantity < 1) {
            return refusal(UserErrorCode.QUANTITY_INVALID, "A quantity is one or more.", "quantity")
        }
        val existing = lineFor(product.id)
        val wanted = quantity + (existing?.quantity ?: 0)
        if (!product.hasStockFor(wanted)) {
            return outOfStock(product, wanted)
        }
        val changed = if (existing == null) {
            lines + CartLine(newLineId, product, wanted)
        } else {
            lines.map { line -> if (line.id == existing.id) line.copy(product = product, quantity = wanted) else line }
        }
        return Result.Success(copy(lines = changed, updatedAt = moment))
    }

    fun withLineQuantityChanged(lineId: String, quantity: Int, moment: Instant): Result<Cart> {
        if (quantity < 1) {
            return refusal(
                UserErrorCode.QUANTITY_INVALID,
                "A quantity is one or more, and removeCartLine is how a line goes away.",
                "quantity",
            )
        }
        val line = lines.firstOrNull { candidate -> candidate.id == lineId }
            ?: return refusal(UserErrorCode.CART_LINE_NOT_FOUND, "That line is not in this cart.", "lineId")
        if (!line.product.hasStockFor(quantity)) {
            return outOfStock(line.product, quantity)
        }
        val changed = lines.map { candidate ->
            if (candidate.id == lineId) candidate.copy(quantity = quantity) else candidate
        }
        return Result.Success(copy(lines = changed, updatedAt = moment))
    }

    fun withLineRemoved(lineId: String, moment: Instant): Result<Cart> {
        if (lines.none { line -> line.id == lineId }) {
            return refusal(UserErrorCode.CART_LINE_NOT_FOUND, "That line is not in this cart.", "lineId")
        }
        return Result.Success(copy(lines = lines.filterNot { line -> line.id == lineId }, updatedAt = moment))
    }

    fun withPromotion(applied: AppliedPromotion, moment: Instant): Cart =
        copy(promotionCode = applied.code, promotion = applied, updatedAt = moment)

    fun withoutPromotion(moment: Instant): Cart =
        if (promotionCode == null && promotion == null) {
            this
        } else {
            copy(promotionCode = null, promotion = null, updatedAt = moment)
        }

    fun emptied(moment: Instant): Cart =
        copy(lines = emptyList(), promotionCode = null, promotion = null, updatedAt = moment)

    fun belongingTo(customerId: String, moment: Instant): Cart = copy(customerId = customerId, updatedAt = moment)

    private fun outOfStock(product: Product, wanted: Int): Result.Refused = refusal(
        UserErrorCode.OUT_OF_STOCK,
        "${product.name} has ${product.stock} in stock and $wanted were asked for.",
        "quantity",
    )

    companion object {
        fun empty(id: String, customerId: String?, moment: Instant) =
            Cart(id, customerId, emptyList(), null, null, moment)
    }
}
