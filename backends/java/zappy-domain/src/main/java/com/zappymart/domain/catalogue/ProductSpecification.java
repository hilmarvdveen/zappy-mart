package com.zappymart.domain.catalogue;

import java.util.List;
import java.util.Locale;

public sealed interface ProductSpecification {

    boolean isSatisfiedBy(Product product);

    record EveryProduct() implements ProductSpecification {
        @Override
        public boolean isSatisfiedBy(Product product) {
            return true;
        }
    }

    record InCategory(String categorySlug) implements ProductSpecification {
        @Override
        public boolean isSatisfiedBy(Product product) {
            return product.category().slug().equals(categorySlug);
        }
    }

    record NameContains(String text) implements ProductSpecification {
        @Override
        public boolean isSatisfiedBy(Product product) {
            return product.name().toLowerCase(Locale.ROOT).contains(text.toLowerCase(Locale.ROOT));
        }
    }

    record InStock() implements ProductSpecification {
        @Override
        public boolean isSatisfiedBy(Product product) {
            return product.isInStock();
        }
    }

    record AllOf(List<ProductSpecification> parts) implements ProductSpecification {
        public AllOf {
            parts = List.copyOf(parts);
        }

        @Override
        public boolean isSatisfiedBy(Product product) {
            return parts.stream().allMatch(part -> part.isSatisfiedBy(product));
        }
    }

    default ProductSpecification and(ProductSpecification other) {
        if (this instanceof EveryProduct) {
            return other;
        }
        if (other instanceof EveryProduct) {
            return this;
        }
        return new AllOf(List.of(this, other));
    }

    static ProductSpecification everyProduct() {
        return new EveryProduct();
    }
}
