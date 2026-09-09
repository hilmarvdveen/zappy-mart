package com.zappymart.application.catalogue;

import com.zappymart.application.ports.CategoryRepository;
import com.zappymart.domain.catalogue.Category;

import java.util.List;

public final class ListCategories {

    private final CategoryRepository categoryRepository;

    public ListCategories(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> execute() {
        return categoryRepository.inCatalogueOrder();
    }
}
