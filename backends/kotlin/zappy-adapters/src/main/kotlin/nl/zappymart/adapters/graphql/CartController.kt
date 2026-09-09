package nl.zappymart.adapters.graphql

import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.ApplyPromotionCode
import nl.zappymart.application.cart.CartChange
import nl.zappymart.application.cart.ChangeCartLineQuantity
import nl.zappymart.application.cart.RemoveCartLine
import nl.zappymart.application.cart.RemovePromotionCode
import nl.zappymart.application.cart.ViewCart
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.promotions.AppliedPromotion
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.graphql.data.method.annotation.SchemaMapping
import org.springframework.stereotype.Controller

@Controller
class CartController(
    private val viewCart: ViewCart,
    private val addToCart: AddToCart,
    private val changeCartLineQuantity: ChangeCartLineQuantity,
    private val removeCartLine: RemoveCartLine,
    private val applyPromotionCode: ApplyPromotionCode,
    private val removePromotionCode: RemovePromotionCode,
) {

    @QueryMapping
    fun cart(@ContextValue requestContext: RequestContext): Cart = viewCart.execute(requestContext.visitor)

    @MutationMapping
    fun addToCart(
        @ContextValue requestContext: RequestContext,
        @Argument productId: String,
        @Argument quantity: Int?,
    ): CartPayload = answer(requestContext, addToCart.execute(requestContext.visitor, productId, quantity ?: 1))

    @MutationMapping
    fun changeCartLineQuantity(
        @ContextValue requestContext: RequestContext,
        @Argument lineId: String,
        @Argument quantity: Int,
    ): CartPayload = answer(requestContext, changeCartLineQuantity.execute(requestContext.visitor, lineId, quantity))

    @MutationMapping
    fun removeCartLine(
        @ContextValue requestContext: RequestContext,
        @Argument lineId: String,
    ): CartPayload = answer(requestContext, removeCartLine.execute(requestContext.visitor, lineId))

    @MutationMapping
    fun applyPromotionCode(
        @ContextValue requestContext: RequestContext,
        @Argument code: String,
    ): CartPayload = answer(requestContext, applyPromotionCode.execute(requestContext.visitor, code))

    @MutationMapping
    fun removePromotionCode(@ContextValue requestContext: RequestContext): CartPayload =
        answer(requestContext, removePromotionCode.execute(requestContext.visitor))

    @SchemaMapping(typeName = "AppliedPromotion", field = "code")
    fun appliedPromotionCode(promotion: AppliedPromotion): String = promotion.code.value

    private fun answer(requestContext: RequestContext, change: CartChange): CartPayload {
        if (change.cart.customerId == null) {
            requestContext.remembersCart(change.cart.id)
        }
        return CartPayload(change.cart, change.availableStock, change.errors)
    }
}
