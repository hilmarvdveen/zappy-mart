package com.zappymart.application.catalogue;

import com.zappymart.domain.catalogue.ProductSpecification;

public record ProductFilter(String categorySlug, String nameContains, Boolean inStockOnly) {

    public static ProductFilter everything() {
        return new ProductFilter(null, null, null);
    }

    public boolean keepsOnlyWhatIsInStock() {
        return Boolean.TRUE.equals(inStockOnly);
    }

    public ProductSpecification asSpecification() {
        ProductSpecification specification = ProductSpecification.everyProduct();
        if (categorySlug != null && !categorySlug.isBlank()) {
            specification = specification.and(new ProductSpecification.InCategory(categorySlug));
        }
        if (nameContains != null && !nameContains.isBlank()) {
            specification = specification.and(new ProductSpecification.NameContains(nameContains));
        }
        if (keepsOnlyWhatIsInStock()) {
            specification = specification.and(new ProductSpecification.InStock());
        }
        return specification;
    }
}
