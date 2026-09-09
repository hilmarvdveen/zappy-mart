package com.zappymart.domain.ordering;

import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.cart.CartLine;
import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

public record Order(
        String id,
        String number,
        String customerId,
        OrderStatus status,
        List<OrderLine> lines,
        String promotionCode,
        Money subtotal,
        Money discount,
        Money shipping,
        Money total,
        Instant placedAt) {

    public Order {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(number, "number");
        Objects.requireNonNull(customerId, "customerId");
        Objects.requireNonNull(status, "status");
        lines = List.copyOf(lines);
        Objects.requireNonNull(subtotal, "subtotal");
        Objects.requireNonNull(discount, "discount");
        Objects.requireNonNull(shipping, "shipping");
        Objects.requireNonNull(total, "total");
        Objects.requireNonNull(placedAt, "placedAt");
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("An order holds at least one line");
        }
    }

    public static Result<Order> place(String id, String number, String customerId, Cart cart, Instant moment) {
        if (!cart.hasLines()) {
            return Result.refuse(UserErrorCode.CART_EMPTY, "The cart has no lines, so there is nothing to order.");
        }
        for (CartLine line : cart.lines()) {
            if (!line.product().hasStockFor(line.quantity())) {
                return Result.refuse(UserErrorCode.OUT_OF_STOCK,
                        "There is not enough stock of " + line.product().name() + ", so no order was placed.");
            }
        }
        List<OrderLine> orderLines = cart.lines().stream()
                .map(line -> new OrderLine(line.product().id(), line.product().name(),
                        line.product().price(), line.quantity()))
                .toList();
        String appliedCode = cart.promotionCode() == null ? null : cart.promotionCode().value();
        return Result.of(new Order(id, number, customerId, OrderStatus.PAID, orderLines, appliedCode,
                cart.subtotal(), cart.discount(), cart.shipping(), cart.total(), moment));
    }

    public OrderPlaced placementEvent() {
        return new OrderPlaced(id, number, customerId, promotionCode, placedAt);
    }
}
