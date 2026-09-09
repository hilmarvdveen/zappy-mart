package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "carts")
class CartRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "customer_id")
    String customerId;

    @Column(name = "promotion_code")
    String promotionCode;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    protected CartRow() {
    }

    CartRow(String id, String customerId, String promotionCode, Instant updatedAt) {
        this.id = id;
        this.customerId = customerId;
        this.promotionCode = promotionCode;
        this.updatedAt = updatedAt;
    }
}
