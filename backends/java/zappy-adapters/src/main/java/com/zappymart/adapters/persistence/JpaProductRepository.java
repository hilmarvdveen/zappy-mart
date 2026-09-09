package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.ProductRepository;
import com.zappymart.domain.catalogue.Category;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Money;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class JpaProductRepository implements ProductRepository {

    private final ProductRowRepository productRows;
    private final CategoryRowRepository categoryRows;

    JpaProductRepository(ProductRowRepository productRows, CategoryRowRepository categoryRows) {
        this.productRows = productRows;
        this.categoryRows = categoryRows;
    }

    @Override
    public List<Product> catalogue() {
        Map<String, Category> categoriesBySlug = categoriesBySlug();
        return productRows.findAllByOrderByPositionAsc().stream()
                .map(row -> productOf(row, categoriesBySlug))
                .toList();
    }

    @Override
    public Optional<Product> byId(String productId) {
        return productRows.findById(productId).map(row -> productOf(row, categoriesBySlug()));
    }

    @Override
    public Optional<Product> bySlug(String slug) {
        return productRows.findBySlug(slug).map(row -> productOf(row, categoriesBySlug()));
    }

    @Override
    public List<Product> byIds(Collection<String> productIds) {
        if (productIds.isEmpty()) {
            return List.of();
        }
        Map<String, Category> categoriesBySlug = categoriesBySlug();
        return productRows.findAllByIdIn(productIds).stream()
                .map(row -> productOf(row, categoriesBySlug))
                .toList();
    }

    @Override
    public void reduceStock(String productId, int quantity) {
        productRows.findById(productId).ifPresent(row -> row.stock = row.stock - quantity);
    }

    private Map<String, Category> categoriesBySlug() {
        return categoryRows.findAllByOrderByPositionAsc().stream()
                .map(row -> new Category(row.id, row.name, row.slug))
                .collect(Collectors.toMap(Category::slug, Function.identity()));
    }

    private static Product productOf(ProductRow row, Map<String, Category> categoriesBySlug) {
        return new Product(row.id, row.name, row.slug, row.description,
                new Money(row.priceAmount, row.priceCurrency), categoriesBySlug.get(row.categorySlug),
                row.stock, row.imageUrl);
    }
}
