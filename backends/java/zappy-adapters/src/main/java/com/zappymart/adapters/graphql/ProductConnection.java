package com.zappymart.adapters.graphql;

import com.zappymart.application.Page;
import com.zappymart.domain.catalogue.Product;

import java.util.List;

public record ProductConnection(List<ProductEdge> edges, PageInfo pageInfo, int totalCount) {

    public static ProductConnection of(Page<Product> page) {
        List<ProductEdge> edges = page.items().stream()
                .map(product -> new ProductEdge(Cursors.encode(product.id()), product))
                .toList();
        String endCursor = edges.isEmpty() ? null : edges.getLast().cursor();
        return new ProductConnection(edges, new PageInfo(page.hasNextPage(), endCursor), page.totalCount());
    }
}
