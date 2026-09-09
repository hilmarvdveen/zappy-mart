package com.zappymart.adapters.graphql;

import com.zappymart.domain.ordering.Order;

public record OrderEdge(String cursor, Order node) {
}
