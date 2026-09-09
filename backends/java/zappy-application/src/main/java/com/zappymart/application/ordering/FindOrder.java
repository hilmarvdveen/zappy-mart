package com.zappymart.application.ordering;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.OrderRepository;
import com.zappymart.domain.ordering.Order;

import java.util.Optional;

public final class FindOrder {

    private final OrderRepository orderRepository;

    public FindOrder(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Optional<Order> execute(Visitor visitor, String orderId) {
        if (!visitor.isSignedIn()) {
            return Optional.empty();
        }
        return orderRepository.byIdOfCustomer(orderId, visitor.customerId());
    }
}
