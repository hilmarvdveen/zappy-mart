package com.zappymart.domain.cart;

import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.ordering.ShippingCharge;
import com.zappymart.domain.promotions.AppliedPromotion;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.promotions.PromotionRule;
import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public final class Cart {

    private final String id;
    private final String customerId;
    private final List<CartLine> lines;
    private final PromotionCode promotionCode;
    private final PromotionRule promotionRule;
    private final Instant updatedAt;

    private Cart(String id, String customerId, List<CartLine> lines,
                 PromotionCode promotionCode, PromotionRule promotionRule, Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.customerId = customerId;
        this.lines = List.copyOf(lines);
        this.promotionCode = promotionCode;
        this.promotionRule = promotionRule;
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public static Cart empty(String id, String customerId, Instant moment) {
        return new Cart(id, customerId, List.of(), null, null, moment);
    }

    public static Cart of(String id, String customerId, List<CartLine> lines,
                          PromotionCode promotionCode, PromotionRule promotionRule, Instant updatedAt) {
        return new Cart(id, customerId, lines, promotionCode, promotionRule, updatedAt);
    }

    public String id() {
        return id;
    }

    public String customerId() {
        return customerId;
    }

    public List<CartLine> lines() {
        return lines;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    public PromotionCode promotionCode() {
        return promotionCode;
    }

    public PromotionRule promotionRule() {
        return promotionRule;
    }

    public AppliedPromotion promotion() {
        if (promotionCode == null || promotionRule == null) {
            return null;
        }
        return new AppliedPromotion(promotionCode.value(), promotionRule.kind(),
                promotionRule.discountFor(subtotal()), promotionRule.carriesShipping());
    }

    public Money subtotal() {
        return lines.stream().map(CartLine::lineTotal).reduce(Money.zero(), Money::plus);
    }

    public Money discount() {
        AppliedPromotion applied = promotion();
        return applied == null ? Money.zero() : applied.discount();
    }

    public Money shipping() {
        return ShippingCharge.forCart(subtotal(), lines.size(),
                promotionRule != null && promotionRule.carriesShipping());
    }

    public Money total() {
        return subtotal().plus(shipping()).minus(discount());
    }

    public boolean hasLines() {
        return !lines.isEmpty();
    }

    public Optional<CartLine> lineFor(String lineId) {
        return lines.stream().filter(line -> line.id().equals(lineId)).findFirst();
    }

    public Result<Cart> add(String newLineId, Product product, int quantity, Instant moment) {
        if (quantity < 1) {
            return Result.refuse(UserErrorCode.QUANTITY_INVALID,
                    "A quantity is a whole number of one or more.", "quantity");
        }
        Optional<CartLine> existing = lines.stream()
                .filter(line -> line.product().id().equals(product.id()))
                .findFirst();
        int wanted = existing.map(CartLine::quantity).orElse(0) + quantity;
        if (!product.hasStockFor(wanted)) {
            return outOfStock(product);
        }
        List<CartLine> changed = new ArrayList<>(lines);
        if (existing.isPresent()) {
            changed.set(changed.indexOf(existing.get()), existing.get().withQuantity(wanted));
        } else {
            changed.add(new CartLine(newLineId, product, quantity));
        }
        return Result.of(withLines(changed, moment));
    }

    public Result<Cart> changeLineQuantity(String lineId, int quantity, Instant moment) {
        if (quantity < 1) {
            return Result.refuse(UserErrorCode.QUANTITY_INVALID,
                    "A quantity is a whole number of one or more. Remove the line to take the product out of the cart.",
                    "quantity");
        }
        Optional<CartLine> existing = lineFor(lineId);
        if (existing.isEmpty()) {
            return lineNotFound();
        }
        CartLine line = existing.get();
        if (!line.product().hasStockFor(quantity)) {
            return outOfStock(line.product());
        }
        List<CartLine> changed = new ArrayList<>(lines);
        changed.set(changed.indexOf(line), line.withQuantity(quantity));
        return Result.of(withLines(changed, moment));
    }

    public Result<Cart> removeLine(String lineId, Instant moment) {
        Optional<CartLine> existing = lineFor(lineId);
        if (existing.isEmpty()) {
            return lineNotFound();
        }
        List<CartLine> changed = new ArrayList<>(lines);
        changed.remove(existing.get());
        return Result.of(withLines(changed, moment));
    }

    public Cart withPromotion(PromotionCode code, PromotionRule rule, Instant moment) {
        return new Cart(id, customerId, lines, code, rule, moment);
    }

    public Cart withoutPromotion(Instant moment) {
        return new Cart(id, customerId, lines, null, null, moment);
    }

    public Cart emptied(Instant moment) {
        return new Cart(id, customerId, List.of(), null, null, moment);
    }

    public Cart belongingTo(String newCustomerId, Instant moment) {
        return new Cart(id, newCustomerId, lines, promotionCode, promotionRule, moment);
    }

    public Cart absorbing(Cart other, LineIdentifiers lineIdentifiers, Instant moment) {
        Cart merged = this;
        for (CartLine line : other.lines()) {
            Result<Cart> attempt = merged.add(lineIdentifiers.next(), line.product(), line.quantity(), moment);
            merged = attempt.orElse(merged);
        }
        if (merged.promotionCode == null && other.promotionCode != null) {
            merged = merged.withPromotion(other.promotionCode, other.promotionRule, moment);
        }
        return merged;
    }

    private Cart withLines(List<CartLine> changed, Instant moment) {
        if (changed.isEmpty()) {
            return new Cart(id, customerId, changed, null, null, moment);
        }
        return new Cart(id, customerId, changed, promotionCode, promotionRule, moment);
    }

    private Result<Cart> outOfStock(Product product) {
        return Result.refuse(UserErrorCode.OUT_OF_STOCK,
                "There is not enough stock of " + product.name() + ".", "quantity");
    }

    private Result<Cart> lineNotFound() {
        return Result.refuse(UserErrorCode.CART_LINE_NOT_FOUND,
                "This cart has no line with that id.", "lineId");
    }

    @FunctionalInterface
    public interface LineIdentifiers {
        String next();
    }
}
