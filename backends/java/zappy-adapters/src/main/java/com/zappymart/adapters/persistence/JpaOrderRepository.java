package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.OrderRepository;
import com.zappymart.domain.ordering.Order;
import com.zappymart.domain.ordering.OrderLine;
import com.zappymart.domain.ordering.OrderStatus;
import com.zappymart.domain.shared.Money;

import java.util.List;
import java.util.Optional;

public final class JpaOrderRepository implements OrderRepository {

    private static final String ORDER_NUMBER_PREFIX = "ZM-";

    private final OrderRowRepository orderRows;
    private final OrderLineRowRepository orderLineRows;

    JpaOrderRepository(OrderRowRepository orderRows, OrderLineRowRepository orderLineRows) {
        this.orderRows = orderRows;
        this.orderLineRows = orderLineRows;
    }

    @Override
    public Order save(Order order) {
        orderRows.save(new OrderRow(order.id(), order.number(), order.customerId(), order.status().name(),
                order.promotionCode(), order.subtotal().amount(), order.discount().amount(),
                order.shipping().amount(), order.total().amount(), order.total().currency(), order.placedAt()));
        List<OrderLine> lines = order.lines();
        for (int position = 0; position < lines.size(); position++) {
            OrderLine line = lines.get(position);
            orderLineRows.save(new OrderLineRow(order.id() + ":" + position, order.id(), line.productId(),
                    line.productName(), line.unitPrice().amount(), line.unitPrice().currency(),
                    line.quantity(), position));
        }
        return order;
    }

    @Override
    public List<Order> ofCustomerNewestFirst(String customerId) {
        return orderRows.findByCustomerIdOrderByPlacedAtDescIdDesc(customerId).stream()
                .map(this::orderOf)
                .toList();
    }

    @Override
    public Optional<Order> byIdOfCustomer(String orderId, String customerId) {
        return orderRows.findByIdAndCustomerId(orderId, customerId).map(this::orderOf);
    }

    @Override
    public String nextOrderNumber() {
        return ORDER_NUMBER_PREFIX + String.format("%06d", orderRows.count() + 1);
    }

    private Order orderOf(OrderRow row) {
        List<OrderLine> lines = orderLineRows.findByOrderIdOrderByPositionAsc(row.id).stream()
                .map(lineRow -> new OrderLine(lineRow.productId, lineRow.productName,
                        new Money(lineRow.unitPrice, lineRow.currency), lineRow.quantity))
                .toList();
        return new Order(row.id, row.number, row.customerId, OrderStatus.valueOf(row.status), lines,
                row.promotionCode, new Money(row.subtotal, row.currency), new Money(row.discount, row.currency),
                new Money(row.shipping, row.currency), new Money(row.total, row.currency), row.placedAt);
    }
}
