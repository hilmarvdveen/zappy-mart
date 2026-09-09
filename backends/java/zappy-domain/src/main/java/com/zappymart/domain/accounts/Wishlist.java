package com.zappymart.domain.accounts;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public record Wishlist(String ownerId, List<String> productIds) {

    public Wishlist {
        Objects.requireNonNull(ownerId, "ownerId");
        productIds = List.copyOf(productIds);
    }

    public static Wishlist emptyFor(String ownerId) {
        return new Wishlist(ownerId, List.of());
    }

    public Wishlist wishing(String productId) {
        if (productIds.contains(productId)) {
            return this;
        }
        List<String> wished = new ArrayList<>();
        wished.add(productId);
        wished.addAll(productIds);
        return new Wishlist(ownerId, wished);
    }

    public Wishlist noLongerWishing(String productId) {
        if (!productIds.contains(productId)) {
            return this;
        }
        List<String> wished = new ArrayList<>(productIds);
        wished.remove(productId);
        return new Wishlist(ownerId, wished);
    }

    public Wishlist absorbing(Wishlist other) {
        Wishlist merged = this;
        for (String productId : other.productIds().reversed()) {
            merged = merged.wishing(productId);
        }
        return merged;
    }
}
