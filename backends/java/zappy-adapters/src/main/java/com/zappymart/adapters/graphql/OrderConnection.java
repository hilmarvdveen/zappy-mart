package com.zappymart.adapters.graphql;

import com.zappymart.application.Page;
import com.zappymart.domain.ordering.Order;

import java.util.List;

public record OrderConnection(List<OrderEdge> edges, PageInfo pageInfo, int totalCount) {

    public static OrderConnection of(Page<Order> page) {
        List<OrderEdge> edges = page.items().stream()
                .map(order -> new OrderEdge(Cursors.encode(order.id()), order))
                .toList();
        String endCursor = edges.isEmpty() ? null : edges.getLast().cursor();
        return new OrderConnection(edges, new PageInfo(page.hasNextPage(), endCursor), page.totalCount());
    }
}
