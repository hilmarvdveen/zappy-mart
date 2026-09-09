package com.zappymart.host;

import org.junit.jupiter.api.Test;

class OrderingGraphQlTest extends StoreTest {

    private static final String PLACE_ORDER = """
            mutation { placeOrder(idempotencyKey: "one checkout attempt") {
                order { id number status subtotal { amount } discount { amount } shipping { amount }
                        total { amount } promotionCode placedAt
                        lines { productName quantity unitPrice { amount } lineTotal { amount } } }
                errors { code message }
            } }
            """;

    @Test
    void placesAnOrderFromTheCartAndEmptiesIt() {
        store.send("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");
        logInAsJane();

        store.send(PLACE_ORDER)
                .jsonPath("$.data.placeOrder.errors.length()").isEqualTo(0)
                .jsonPath("$.data.placeOrder.order.number").isEqualTo("ZM-000001")
                .jsonPath("$.data.placeOrder.order.status").isEqualTo("PAID")
                .jsonPath("$.data.placeOrder.order.subtotal.amount").isEqualTo(1970)
                .jsonPath("$.data.placeOrder.order.discount.amount").isEqualTo(0)
                .jsonPath("$.data.placeOrder.order.shipping.amount").isEqualTo(495)
                .jsonPath("$.data.placeOrder.order.total.amount").isEqualTo(2465)
                .jsonPath("$.data.placeOrder.order.promotionCode").doesNotExist()
                .jsonPath("$.data.placeOrder.order.lines[0].productName")
                .isEqualTo("MBJ Women's Solid Short Sleeve Boat Neck V")
                .jsonPath("$.data.placeOrder.order.lines[0].lineTotal.amount").isEqualTo(1970);

        store.send("{ cart { lines { id } total { amount } } product(slug: \"mbj-womens-solid-short-sleeve-boat-neck-v\") { stock } }")
                .jsonPath("$.data.cart.lines.length()").isEqualTo(0)
                .jsonPath("$.data.cart.total.amount").isEqualTo(0)
                .jsonPath("$.data.product.stock").isEqualTo(23);
    }

    @Test
    void keepsThePromotionCodeAndCountsItsUse() {
        store.send("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");
        store.send("mutation { applyPromotionCode(code: \"FREESHIP\") { errors { code } } }");
        logInAsJane();

        store.send(PLACE_ORDER)
                .jsonPath("$.data.placeOrder.order.promotionCode").isEqualTo("FREESHIP")
                .jsonPath("$.data.placeOrder.order.shipping.amount").isEqualTo(0)
                .jsonPath("$.data.placeOrder.order.total.amount").isEqualTo(1970);
    }

    @Test
    void needsASignedInCustomerAndANonEmptyCart() {
        store.send(PLACE_ORDER)
                .jsonPath("$.data.placeOrder.order").doesNotExist()
                .jsonPath("$.data.placeOrder.errors[0].code").isEqualTo("NOT_AUTHENTICATED");

        logInAsJane();

        store.send(PLACE_ORDER)
                .jsonPath("$.data.placeOrder.errors[0].code").isEqualTo("CART_EMPTY");
    }

    @Test
    void aSecondCheckoutWithTheSameKeyFindsAnEmptyCart() {
        store.send("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");
        logInAsJane();
        store.send(PLACE_ORDER).jsonPath("$.data.placeOrder.order.number").isEqualTo("ZM-000001");

        store.send(PLACE_ORDER).jsonPath("$.data.placeOrder.errors[0].code").isEqualTo("CART_EMPTY");
    }

    @Test
    void listsTheOrdersOfTheCustomerNewestFirstAndFindsOneById() {
        store.send("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");
        logInAsJane();
        String orderId = store.valueOf(PLACE_ORDER, "$.data.placeOrder.order.id");

        store.send("{ orders(first: 5) { totalCount pageInfo { hasNextPage } edges { cursor node { id number } } } }")
                .jsonPath("$.data.orders.totalCount").isEqualTo(1)
                .jsonPath("$.data.orders.pageInfo.hasNextPage").isEqualTo(false)
                .jsonPath("$.data.orders.edges[0].node.id").isEqualTo(orderId);
        store.send("{ order(id: \"%s\") { number total { amount } } }".formatted(orderId))
                .jsonPath("$.data.order.number").isEqualTo("ZM-000001");
        store.send("{ order(id: \"an-order-nobody-placed\") { number } }")
                .jsonPath("$.data.order").doesNotExist();
    }

    @Test
    void answersAnEmptyOrderHistoryToAVisitorWhoIsNotSignedIn() {
        store.send("{ orders { totalCount edges { node { id } } } order(id: \"order-01\") { id } }")
                .jsonPath("$.data.orders.totalCount").isEqualTo(0)
                .jsonPath("$.data.orders.edges.length()").isEqualTo(0)
                .jsonPath("$.data.order").doesNotExist();
    }
}
