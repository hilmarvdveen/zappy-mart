package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "order_lines")
class OrderLineRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "order_id", nullable = false)
    String orderId;

    @Column(name = "product_id", nullable = false)
    String productId;

    @Column(name = "product_name", nullable = false)
    String productName;

    @Column(name = "unit_price", nullable = false)
    int unitPrice;

    @Column(name = "currency", nullable = false)
    String currency;

    @Column(name = "quantity", nullable = false)
    int quantity;

    @Column(name = "list_position", nullable = false)
    int position;

    protected OrderLineRow() {
    }

    OrderLineRow(String id, String orderId, String productId, String productName, int unitPrice,
                 String currency, int quantity, int position) {
        this.id = id;
        this.orderId = orderId;
        this.productId = productId;
        this.productName = productName;
        this.unitPrice = unitPrice;
        this.currency = currency;
        this.quantity = quantity;
        this.position = position;
    }
}
