package com.zappymart.adapters.graphql;

import com.zappymart.domain.catalogue.Product;

public record ProductEdge(String cursor, Product node) {
}
