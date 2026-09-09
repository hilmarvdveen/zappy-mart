package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
class CategoryRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "slug", nullable = false, unique = true)
    String slug;

    @Column(name = "list_position", nullable = false)
    int position;

    protected CategoryRow() {
    }

    CategoryRow(String id, String name, String slug, int position) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.position = position;
    }
}
