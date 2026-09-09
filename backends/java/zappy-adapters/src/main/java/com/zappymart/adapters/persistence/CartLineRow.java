package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "cart_lines")
class CartLineRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "cart_id", nullable = false)
    String cartId;

    @Column(name = "product_id", nullable = false)
    String productId;

    @Column(name = "quantity", nullable = false)
    int quantity;

    @Column(name = "list_position", nullable = false)
    int position;

    protected CartLineRow() {
    }

    CartLineRow(String id, String cartId, String productId, int quantity, int position) {
        this.id = id;
        this.cartId = cartId;
        this.productId = productId;
        this.quantity = quantity;
        this.position = position;
    }
}
