package com.zappymart.application.ports;

import com.zappymart.domain.ordering.Order;

import java.util.List;
import java.util.Optional;

public interface OrderRepository {

    Order save(Order order);

    List<Order> ofCustomerNewestFirst(String customerId);

    Optional<Order> byIdOfCustomer(String orderId, String customerId);

    String nextOrderNumber();
}
