package nl.zappymart.domain.ordering

import java.time.Instant
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class Order(
    val id: String,
    val number: String,
    val customerId: String,
    val status: OrderStatus,
    val lines: List<OrderLine>,
    val promotionCode: PromotionCode?,
    val subtotal: Money,
    val discount: Money,
    val shipping: Money,
    val total: Money,
    val placedAt: Instant,
) {

    fun placed() = OrderPlaced(id, number, customerId, promotionCode, placedAt)

    companion object {

        fun place(cart: Cart, customerId: String, id: String, number: String, moment: Instant): Result<Order> {
            if (cart.isEmpty) {
                return refusal(UserErrorCode.CART_EMPTY, "There is nothing in the cart to order.")
            }
            val short = cart.lines.firstOrNull { line -> !line.product.hasStockFor(line.quantity) }
            if (short != null) {
                return refusal(
                    UserErrorCode.OUT_OF_STOCK,
                    "${short.product.name} has ${short.product.stock} in stock and ${short.quantity} were ordered.",
                )
            }
            return Result.Success(
                Order(
                    id = id,
                    number = number,
                    customerId = customerId,
                    status = OrderStatus.PAID,
                    lines = cart.lines.map { line ->
                        OrderLine(line.product.id, line.product.name, line.product.price, line.quantity)
                    },
                    promotionCode = cart.promotion?.code,
                    subtotal = cart.subtotal,
                    discount = cart.discount,
                    shipping = cart.shipping,
                    total = cart.total,
                    placedAt = moment,
                ),
            )
        }
    }
}
