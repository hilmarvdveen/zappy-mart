package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.ProductRepository;
import com.zappymart.domain.catalogue.Product;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

public final class CachedProductRepository implements ProductRepository {

    private final ProductRepository catalogueBehindTheCache;
    private final AtomicReference<List<Product>> remembered = new AtomicReference<>();

    public CachedProductRepository(ProductRepository catalogueBehindTheCache) {
        this.catalogueBehindTheCache = catalogueBehindTheCache;
    }

    @Override
    public List<Product> catalogue() {
        List<Product> known = remembered.get();
        if (known != null) {
            return known;
        }
        List<Product> read = catalogueBehindTheCache.catalogue();
        remembered.set(read);
        return read;
    }

    @Override
    public Optional<Product> byId(String productId) {
        return catalogue().stream().filter(product -> product.id().equals(productId)).findFirst();
    }

    @Override
    public Optional<Product> bySlug(String slug) {
        return catalogue().stream().filter(product -> product.slug().equals(slug)).findFirst();
    }

    @Override
    public List<Product> byIds(Collection<String> productIds) {
        return catalogue().stream().filter(product -> productIds.contains(product.id())).toList();
    }

    @Override
    public void reduceStock(String productId, int quantity) {
        catalogueBehindTheCache.reduceStock(productId, quantity);
        forget();
    }

    public void forget() {
        remembered.set(null);
    }
}
