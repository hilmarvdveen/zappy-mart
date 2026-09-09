package com.zappymart.domain.catalogue;

import com.zappymart.domain.shared.Money;

import java.util.Objects;

public record Product(
        String id,
        String name,
        String slug,
        String description,
        Money price,
        Category category,
        int stock,
        String imageUrl) {

    public Product {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(slug, "slug");
        Objects.requireNonNull(description, "description");
        Objects.requireNonNull(price, "price");
        Objects.requireNonNull(category, "category");
        if (stock < 0) {
            throw new IllegalArgumentException("A stock is never negative: " + stock);
        }
    }

    public boolean hasStockFor(int quantity) {
        return stock >= quantity;
    }

    public boolean isInStock() {
        return stock > 0;
    }

    public Product withStock(int newStock) {
        return new Product(id, name, slug, description, price, category, newStock, imageUrl);
    }
}
