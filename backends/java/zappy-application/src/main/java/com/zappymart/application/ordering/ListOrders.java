package com.zappymart.application.ordering;

import com.zappymart.application.Page;
import com.zappymart.application.Visitor;
import com.zappymart.application.ports.OrderRepository;
import com.zappymart.domain.ordering.Order;

import java.util.List;

public final class ListOrders {

    private final OrderRepository orderRepository;

    public ListOrders(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Page<Order> execute(Visitor visitor, int first, String afterOrderId) {
        if (!visitor.isSignedIn()) {
            return Page.empty(0);
        }
        List<Order> orders = orderRepository.ofCustomerNewestFirst(visitor.customerId());
        int startIndex = startIndexAfter(orders, afterOrderId);
        if (startIndex < 0) {
            return Page.empty(orders.size());
        }
        return Page.slice(orders, first, startIndex);
    }

    private int startIndexAfter(List<Order> orders, String afterOrderId) {
        if (afterOrderId == null) {
            return 0;
        }
        for (int position = 0; position < orders.size(); position++) {
            if (orders.get(position).id().equals(afterOrderId)) {
                return position + 1;
            }
        }
        return -1;
    }
}
