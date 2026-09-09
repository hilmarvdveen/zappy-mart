package com.zappymart.adapters.graphql;

import com.zappymart.domain.ordering.Order;
import com.zappymart.domain.shared.UserError;

import java.util.List;

public record OrderPayload(Order order, List<UserError> errors) {
}
