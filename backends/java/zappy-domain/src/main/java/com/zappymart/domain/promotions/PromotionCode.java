package com.zappymart.domain.promotions;

import java.util.Locale;
import java.util.Optional;

public record PromotionCode(String value) {

    public PromotionCode {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("A promotion code is never blank");
        }
    }

    public static Optional<PromotionCode> parse(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new PromotionCode(text.trim().toUpperCase(Locale.ROOT)));
    }

    @Override
    public String toString() {
        return value;
    }
}
