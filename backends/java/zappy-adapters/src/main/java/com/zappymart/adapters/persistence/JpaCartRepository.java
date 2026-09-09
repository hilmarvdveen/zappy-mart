package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.application.ports.PromotionRepository;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.cart.CartLine;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.promotions.Promotion;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.promotions.PromotionRule;

import java.util.List;
import java.util.Optional;

public final class JpaCartRepository implements CartRepository {

    private final CartRowRepository cartRows;
    private final CartLineRowRepository cartLineRows;
    private final ProductRepository productRepository;
    private final PromotionRepository promotionRepository;

    JpaCartRepository(CartRowRepository cartRows, CartLineRowRepository cartLineRows,
                      ProductRepository productRepository, PromotionRepository promotionRepository) {
        this.cartRows = cartRows;
        this.cartLineRows = cartLineRows;
        this.productRepository = productRepository;
        this.promotionRepository = promotionRepository;
    }

    @Override
    public Optional<Cart> byId(String cartId) {
        return cartRows.findById(cartId).map(this::cartOf);
    }

    @Override
    public Optional<Cart> ofCustomer(String customerId) {
        return cartRows.findByCustomerId(customerId).map(this::cartOf);
    }

    @Override
    public Cart save(Cart cart) {
        String promotionCode = cart.promotionCode() == null ? null : cart.promotionCode().value();
        cartRows.save(new CartRow(cart.id(), cart.customerId(), promotionCode, cart.updatedAt()));
        cartLineRows.deleteByCartId(cart.id());
        cartLineRows.flush();
        List<CartLine> lines = cart.lines();
        for (int position = 0; position < lines.size(); position++) {
            CartLine line = lines.get(position);
            cartLineRows.save(new CartLineRow(line.id(), cart.id(), line.product().id(), line.quantity(), position));
        }
        return cart;
    }

    @Override
    public void delete(String cartId) {
        cartLineRows.deleteByCartId(cartId);
        cartRows.deleteById(cartId);
    }

    private Cart cartOf(CartRow row) {
        List<CartLine> lines = cartLineRows.findByCartIdOrderByPositionAsc(row.id).stream()
                .flatMap(lineRow -> productRepository.byId(lineRow.productId).stream()
                        .map(product -> lineOf(lineRow, product)))
                .toList();
        Optional<Promotion> promotion = Optional.ofNullable(row.promotionCode)
                .flatMap(PromotionCode::parse)
                .flatMap(promotionRepository::byCode);
        PromotionCode code = promotion.map(Promotion::code).orElse(null);
        PromotionRule rule = promotion.map(Promotion::rule).orElse(null);
        return Cart.of(row.id, row.customerId, lines, code, rule, row.updatedAt);
    }

    private static CartLine lineOf(CartLineRow lineRow, Product product) {
        return new CartLine(lineRow.id, product, lineRow.quantity);
    }
}
