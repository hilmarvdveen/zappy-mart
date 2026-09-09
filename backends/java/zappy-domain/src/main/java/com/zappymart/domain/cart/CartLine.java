package com.zappymart.domain.cart;

import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Money;

import java.util.Objects;

public record CartLine(String id, Product product, int quantity) {

    public CartLine {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(product, "product");
        if (quantity < 1) {
            throw new IllegalArgumentException("A cart line holds at least one product: " + quantity);
        }
    }

    public Money lineTotal() {
        return product.price().times(quantity);
    }

    public CartLine withQuantity(int newQuantity) {
        return new CartLine(id, product, newQuantity);
    }

    public CartLine withProduct(Product newProduct) {
        return new CartLine(id, newProduct, quantity);
    }
}
