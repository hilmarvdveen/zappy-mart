package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.CategoryRepository;
import com.zappymart.domain.catalogue.Category;

import java.util.List;

public final class JpaCategoryRepository implements CategoryRepository {

    private final CategoryRowRepository categoryRows;

    JpaCategoryRepository(CategoryRowRepository categoryRows) {
        this.categoryRows = categoryRows;
    }

    @Override
    public List<Category> inCatalogueOrder() {
        return categoryRows.findAllByOrderByPositionAsc().stream()
                .map(row -> new Category(row.id, row.name, row.slug))
                .toList();
    }
}
