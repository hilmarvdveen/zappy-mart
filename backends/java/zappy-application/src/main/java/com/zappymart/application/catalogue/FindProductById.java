package com.zappymart.application.catalogue;

import com.zappymart.application.ports.ProductRepository;
import com.zappymart.domain.catalogue.Product;

import java.util.Optional;

public final class FindProductById {

    private final ProductRepository productRepository;

    public FindProductById(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Optional<Product> execute(String productId) {
        return productRepository.byId(productId);
    }
}
