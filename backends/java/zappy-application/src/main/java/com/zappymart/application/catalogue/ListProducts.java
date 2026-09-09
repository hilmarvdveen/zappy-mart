package com.zappymart.application.catalogue;

import com.zappymart.application.Page;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.catalogue.ProductSpecification;

import java.util.List;

public final class ListProducts {

    private final ProductRepository productRepository;

    public ListProducts(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Page<Product> execute(ProductFilter filter, int first, String afterProductId) {
        ProductSpecification specification = filter.asSpecification();
        List<Product> matching = productRepository.catalogue().stream()
                .filter(specification::isSatisfiedBy)
                .toList();
        int startIndex = startIndexAfter(matching, afterProductId);
        if (startIndex < 0) {
            return Page.empty(matching.size());
        }
        return Page.slice(matching, first, startIndex);
    }

    private int startIndexAfter(List<Product> matching, String afterProductId) {
        if (afterProductId == null) {
            return 0;
        }
        for (int position = 0; position < matching.size(); position++) {
            if (matching.get(position).id().equals(afterProductId)) {
                return position + 1;
            }
        }
        return -1;
    }
}
