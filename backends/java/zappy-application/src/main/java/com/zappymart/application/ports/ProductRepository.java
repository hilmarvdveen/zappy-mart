package com.zappymart.application.ports;

import com.zappymart.domain.catalogue.Product;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository {

    List<Product> catalogue();

    Optional<Product> byId(String productId);

    Optional<Product> bySlug(String slug);

    List<Product> byIds(Collection<String> productIds);

    void reduceStock(String productId, int quantity);
}
