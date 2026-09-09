package com.zappymart.domain.builders;

import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.cart.CartLine;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.promotions.PromotionRule;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class CartBuilder {

    public static final Instant A_MOMENT = Instant.parse("2026-09-09T12:00:00Z");

    private final List<CartLine> lines = new ArrayList<>();
    private String id = "cart-01";
    private String customerId;
    private PromotionCode promotionCode;
    private PromotionRule promotionRule;

    public static CartBuilder aCart() {
        return new CartBuilder();
    }

    public CartBuilder withId(String newId) {
        this.id = newId;
        return this;
    }

    public CartBuilder ownedBy(String newCustomerId) {
        this.customerId = newCustomerId;
        return this;
    }

    public CartBuilder holding(Product product, int quantity) {
        lines.add(new CartLine("line-" + (lines.size() + 1), product, quantity));
        return this;
    }

    public CartBuilder withPromotion(String code, PromotionRule rule) {
        this.promotionCode = new PromotionCode(code);
        this.promotionRule = rule;
        return this;
    }

    public Cart build() {
        return Cart.of(id, customerId, lines, promotionCode, promotionRule, A_MOMENT);
    }
}
