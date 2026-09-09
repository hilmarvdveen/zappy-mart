package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "orders")
class OrderRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "order_number", nullable = false, unique = true)
    String number;

    @Column(name = "customer_id", nullable = false)
    String customerId;

    @Column(name = "status", nullable = false)
    String status;

    @Column(name = "promotion_code")
    String promotionCode;

    @Column(name = "subtotal", nullable = false)
    int subtotal;

    @Column(name = "discount", nullable = false)
    int discount;

    @Column(name = "shipping", nullable = false)
    int shipping;

    @Column(name = "total", nullable = false)
    int total;

    @Column(name = "currency", nullable = false)
    String currency;

    @Column(name = "placed_at", nullable = false)
    Instant placedAt;

    protected OrderRow() {
    }

    OrderRow(String id, String number, String customerId, String status, String promotionCode,
             int subtotal, int discount, int shipping, int total, String currency, Instant placedAt) {
        this.id = id;
        this.number = number;
        this.customerId = customerId;
        this.status = status;
        this.promotionCode = promotionCode;
        this.subtotal = subtotal;
        this.discount = discount;
        this.shipping = shipping;
        this.total = total;
        this.currency = currency;
        this.placedAt = placedAt;
    }
}
