package com.zappymart.adapters.seed;

import java.util.List;

public record SeedCustomer(
        String id,
        String email,
        String name,
        String password,
        String createdAt,
        List<String> wishlist) {
}
