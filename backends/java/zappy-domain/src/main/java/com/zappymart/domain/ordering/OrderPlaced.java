package com.zappymart.domain.ordering;

import com.zappymart.domain.shared.DomainEvent;

import java.time.Instant;

public record OrderPlaced(
        String orderId,
        String orderNumber,
        String customerId,
        String promotionCode,
        Instant occurredAt) implements DomainEvent {
}
