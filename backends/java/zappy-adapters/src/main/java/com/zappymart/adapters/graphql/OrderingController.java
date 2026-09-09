package com.zappymart.adapters.graphql;

import com.zappymart.application.ordering.FindOrder;
import com.zappymart.application.ordering.ListOrders;
import com.zappymart.application.ordering.PlaceOrder;
import com.zappymart.domain.ordering.Order;
import com.zappymart.domain.shared.Result;
import graphql.GraphQLContext;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class OrderingController {

    public static final int ORDERS_PER_PAGE = 10;

    private final PlaceOrder placeOrder;
    private final ListOrders listOrders;
    private final FindOrder findOrder;

    public OrderingController(PlaceOrder placeOrder, ListOrders listOrders, FindOrder findOrder) {
        this.placeOrder = placeOrder;
        this.listOrders = listOrders;
        this.findOrder = findOrder;
    }

    @QueryMapping
    public OrderConnection orders(@Argument Integer first, @Argument String after,
                                  GraphQLContext graphQlContext) {
        int pageSize = first == null ? ORDERS_PER_PAGE : first;
        return OrderConnection.of(listOrders.execute(RequestContext.from(graphQlContext).visitor(),
                pageSize, Cursors.decode(after)));
    }

    @QueryMapping
    public Order order(@Argument String id, GraphQLContext graphQlContext) {
        return findOrder.execute(RequestContext.from(graphQlContext).visitor(), id).orElse(null);
    }

    @MutationMapping
    public OrderPayload placeOrder(@Argument String idempotencyKey, GraphQLContext graphQlContext) {
        Result<Order> result = placeOrder.execute(RequestContext.from(graphQlContext).visitor());
        if (!result.succeeded()) {
            return new OrderPayload(null, result.errors());
        }
        return new OrderPayload(result.valueOrThrow(), List.of());
    }
}
