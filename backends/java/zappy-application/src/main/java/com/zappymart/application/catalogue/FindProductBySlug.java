package com.zappymart.application.catalogue;

import com.zappymart.application.ports.ProductRepository;
import com.zappymart.domain.catalogue.Product;

import java.util.Optional;

public final class FindProductBySlug {

    private final ProductRepository productRepository;

    public FindProductBySlug(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Optional<Product> execute(String slug) {
        return productRepository.bySlug(slug);
    }
}
