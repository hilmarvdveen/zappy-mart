package com.zappymart.domain.ordering;

import com.zappymart.domain.shared.Money;

import java.util.Objects;

public record OrderLine(String productId, String productName, Money unitPrice, int quantity) {

    public OrderLine {
        Objects.requireNonNull(productId, "productId");
        Objects.requireNonNull(productName, "productName");
        Objects.requireNonNull(unitPrice, "unitPrice");
        if (quantity < 1) {
            throw new IllegalArgumentException("An order line holds at least one product: " + quantity);
        }
    }

    public Money lineTotal() {
        return unitPrice.times(quantity);
    }
}
