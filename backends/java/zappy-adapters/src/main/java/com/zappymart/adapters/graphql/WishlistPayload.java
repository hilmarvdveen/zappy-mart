package com.zappymart.adapters.graphql;

import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.UserError;

import java.util.List;

public record WishlistPayload(List<Product> products, List<UserError> errors) {
}
