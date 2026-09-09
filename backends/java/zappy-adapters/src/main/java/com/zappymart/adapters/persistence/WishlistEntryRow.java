package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "wishlist_entries")
class WishlistEntryRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "owner_id", nullable = false)
    String ownerId;

    @Column(name = "product_id", nullable = false)
    String productId;

    @Column(name = "list_position", nullable = false)
    int position;

    protected WishlistEntryRow() {
    }

    WishlistEntryRow(String id, String ownerId, String productId, int position) {
        this.id = id;
        this.ownerId = ownerId;
        this.productId = productId;
        this.position = position;
    }
}
