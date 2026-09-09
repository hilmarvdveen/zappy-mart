package com.zappymart.adapters.graphql;

import com.zappymart.domain.shared.UserError;

import java.util.List;

public record ResetSeedPayload(boolean success, int loadedProducts, List<UserError> errors) {
}
