package nl.zappymart.adapters.graphql

import nl.zappymart.application.ordering.FindOrder
import nl.zappymart.application.ordering.ListOrders
import nl.zappymart.application.ordering.PlaceOrder
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.shared.Result
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.graphql.data.method.annotation.SchemaMapping
import org.springframework.stereotype.Controller

@Controller
class OrderController(
    private val listOrders: ListOrders,
    private val findOrder: FindOrder,
    private val placeOrder: PlaceOrder,
) {

    @QueryMapping
    fun orders(
        @ContextValue requestContext: RequestContext,
        @Argument first: Int?,
        @Argument after: String?,
    ): OrderConnection = OrderConnection.of(
        listOrders.execute(requestContext.visitor, first ?: DEFAULT_ORDER_PAGE_SIZE, Cursors.idOf(after)),
    )

    @QueryMapping
    fun order(@ContextValue requestContext: RequestContext, @Argument id: String): Order? =
        findOrder.execute(requestContext.visitor, id)

    @MutationMapping
    fun placeOrder(
        @ContextValue requestContext: RequestContext,
        @Argument idempotencyKey: String?,
    ): OrderPayload = when (val outcome = placeOrder.execute(requestContext.visitor)) {
        is Result.Success -> OrderPayload(outcome.value, emptyList())
        is Result.Refused -> OrderPayload(null, outcome.errors)
    }

    @SchemaMapping(typeName = "Order", field = "promotionCode")
    fun orderPromotionCode(order: Order): String? = order.promotionCode?.value

    private companion object {
        const val DEFAULT_ORDER_PAGE_SIZE = 10
    }
}
