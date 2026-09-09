package com.zappymart.adapters.seed;

public record SeedProduct(
        String id,
        String name,
        String slug,
        String description,
        SeedMoney price,
        String categorySlug,
        int stock,
        String imageUrl) {
}
