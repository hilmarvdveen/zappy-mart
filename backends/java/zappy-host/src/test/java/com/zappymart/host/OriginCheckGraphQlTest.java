package com.zappymart.host;

import org.junit.jupiter.api.Test;

class OriginCheckGraphQlTest extends StoreTest {

    private static final String A_MUTATION =
            "mutation { addToCart(productId: \"product-18\", quantity: 1) { cart { id } errors { code } } }";

    @Test
    void refusesAMutationWithoutAnOriginBeforeTheResolverRuns() {
        store.sendWithOrigin(null, A_MUTATION)
                .expectBody()
                .jsonPath("$.data").doesNotExist()
                .jsonPath("$.errors[0].extensions.classification").isEqualTo("FORBIDDEN");
    }

    @Test
    void refusesAMutationFromAnOriginTheStoreDoesNotKnow() {
        store.sendWithOrigin("https://somewhere-else.example", A_MUTATION)
                .expectBody()
                .jsonPath("$.data").doesNotExist()
                .jsonPath("$.errors[0].message").isEqualTo("A mutation needs an Origin header that this store allows.");
    }

    @Test
    void letsEveryQueryThroughWithoutAnOrigin() {
        store.sendWithOrigin(null, "{ products(first: 1) { totalCount } }")
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.data.products.totalCount").isEqualTo(20);
    }

    @Test
    void letsAMutationFromEachFrontendPortThrough() {
        store.sendWithOrigin("http://localhost:5173", A_MUTATION)
                .expectBody().jsonPath("$.data.addToCart.errors.length()").isEqualTo(0);
        store.sendWithOrigin("http://localhost:3001", A_MUTATION)
                .expectBody().jsonPath("$.data.addToCart.errors.length()").isEqualTo(0);
        store.sendWithOrigin("http://localhost:4200", A_MUTATION)
                .expectBody().jsonPath("$.data.addToCart.errors.length()").isEqualTo(0);
    }
}
