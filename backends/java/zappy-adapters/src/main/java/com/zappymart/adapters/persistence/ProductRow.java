package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "products")
class ProductRow {

    @Id
    @Column(name = "id", nullable = false)
    String id;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "slug", nullable = false, unique = true)
    String slug;

    @Column(name = "description", nullable = false, length = 4000)
    String description;

    @Column(name = "price_amount", nullable = false)
    int priceAmount;

    @Column(name = "price_currency", nullable = false)
    String priceCurrency;

    @Column(name = "category_slug", nullable = false)
    String categorySlug;

    @Column(name = "stock", nullable = false)
    int stock;

    @Column(name = "image_url")
    String imageUrl;

    @Column(name = "list_position", nullable = false)
    int position;

    protected ProductRow() {
    }

    ProductRow(String id, String name, String slug, String description, int priceAmount, String priceCurrency,
               String categorySlug, int stock, String imageUrl, int position) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.priceAmount = priceAmount;
        this.priceCurrency = priceCurrency;
        this.categorySlug = categorySlug;
        this.stock = stock;
        this.imageUrl = imageUrl;
        this.position = position;
    }
}
