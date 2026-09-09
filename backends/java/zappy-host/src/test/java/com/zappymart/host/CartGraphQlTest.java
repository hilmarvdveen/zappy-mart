package com.zappymart.host;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CartGraphQlTest extends StoreTest {

    @Test
    void aVisitorWithoutACartSeesAnEmptyOneThatPaysNothing() {
        store.send("{ cart { lines { id } subtotal { amount } shipping { amount } total { amount } } }")
                .jsonPath("$.data.cart.lines.length()").isEqualTo(0)
                .jsonPath("$.data.cart.subtotal.amount").isEqualTo(0)
                .jsonPath("$.data.cart.shipping.amount").isEqualTo(0)
                .jsonPath("$.data.cart.total.amount").isEqualTo(0);
    }

    @Test
    void addsAProductAndSetsTheCartCookieSoTheCartComesBack() {
        store.send("""
                mutation { addToCart(productId: "product-18", quantity: 2) {
                    cart { lines { quantity lineTotal { amount } } subtotal { amount }
                           shipping { amount } total { amount } }
                    availableStock
                    errors { code }
                } }
                """)
                .jsonPath("$.data.addToCart.errors.length()").isEqualTo(0)
                .jsonPath("$.data.addToCart.availableStock").doesNotExist()
                .jsonPath("$.data.addToCart.cart.lines[0].quantity").isEqualTo(2)
                .jsonPath("$.data.addToCart.cart.subtotal.amount").isEqualTo(1970)
                .jsonPath("$.data.addToCart.cart.shipping.amount").isEqualTo(495)
                .jsonPath("$.data.addToCart.cart.total.amount").isEqualTo(2465);

        assertThat(store.cookie("zappy_cart")).isNotBlank();

        store.send("{ cart { lines { quantity } } }")
                .jsonPath("$.data.cart.lines[0].quantity").isEqualTo(2);
    }

    @Test
    void addingTheSameProductAgainRaisesTheQuantity() {
        store.send("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");

        store.send("mutation { addToCart(productId: \"product-18\") { cart { lines { quantity } } } }")
                .jsonPath("$.data.addToCart.cart.lines.length()").isEqualTo(1)
                .jsonPath("$.data.addToCart.cart.lines[0].quantity").isEqualTo(3);
    }

    @Test
    void refusesMoreThanTheStockAndSaysHowManyAreLeft() {
        store.send("mutation { addToCart(productId: \"product-12\") { errors { code } } }");

        store.send("""
                mutation { addToCart(productId: "product-12") {
                    availableStock
                    cart { lines { quantity } }
                    errors { code field }
                } }
                """)
                .jsonPath("$.data.addToCart.errors[0].code").isEqualTo("OUT_OF_STOCK")
                .jsonPath("$.data.addToCart.errors[0].field").isEqualTo("quantity")
                .jsonPath("$.data.addToCart.availableStock").isEqualTo(1)
                .jsonPath("$.data.addToCart.cart.lines[0].quantity").isEqualTo(1);
    }

    @Test
    void refusesTheProductWithNoStockAndOneThatDoesNotExist() {
        store.send("mutation { addToCart(productId: \"product-07\") { availableStock errors { code } } }")
                .jsonPath("$.data.addToCart.errors[0].code").isEqualTo("OUT_OF_STOCK")
                .jsonPath("$.data.addToCart.availableStock").isEqualTo(0);
        store.send("mutation { addToCart(productId: \"product-99\") { errors { code field } } }")
                .jsonPath("$.data.addToCart.errors[0].code").isEqualTo("PRODUCT_NOT_FOUND")
                .jsonPath("$.data.addToCart.errors[0].field").isEqualTo("productId");
    }

    @Test
    void refusesAQuantityOfZeroAndPointsAtRemoval() {
        String lineId = lineOfTwoShirts();

        store.send("mutation { changeCartLineQuantity(lineId: \"%s\", quantity: 0) { errors { code field } } }"
                .formatted(lineId))
                .jsonPath("$.data.changeCartLineQuantity.errors[0].code").isEqualTo("QUANTITY_INVALID")
                .jsonPath("$.data.changeCartLineQuantity.errors[0].field").isEqualTo("quantity");
    }

    @Test
    void changesAndRemovesALineAndRefusesALineThatIsNotThere() {
        String lineId = lineOfTwoShirts();

        store.send("mutation { changeCartLineQuantity(lineId: \"%s\", quantity: 5) { cart { subtotal { amount } } } }"
                .formatted(lineId))
                .jsonPath("$.data.changeCartLineQuantity.cart.subtotal.amount").isEqualTo(4925);
        store.send("mutation { removeCartLine(lineId: \"%s\") { cart { lines { id } total { amount } } } }"
                .formatted(lineId))
                .jsonPath("$.data.removeCartLine.cart.lines.length()").isEqualTo(0)
                .jsonPath("$.data.removeCartLine.cart.total.amount").isEqualTo(0);
        store.send("mutation { removeCartLine(lineId: \"%s\") { errors { code field } } }".formatted(lineId))
                .jsonPath("$.data.removeCartLine.errors[0].code").isEqualTo("CART_LINE_NOT_FOUND")
                .jsonPath("$.data.removeCartLine.errors[0].field").isEqualTo("lineId");
    }

    @Test
    void aFreeShippingCodeTakesTheShippingAwayAndDiscountsNothing() {
        lineOfTwoShirts();

        store.send("""
                mutation { applyPromotionCode(code: "freeship") {
                    cart { subtotal { amount } shipping { amount } total { amount }
                           promotion { code kind discount { amount } } }
                    errors { code }
                } }
                """)
                .jsonPath("$.data.applyPromotionCode.cart.subtotal.amount").isEqualTo(1970)
                .jsonPath("$.data.applyPromotionCode.cart.shipping.amount").isEqualTo(0)
                .jsonPath("$.data.applyPromotionCode.cart.total.amount").isEqualTo(1970)
                .jsonPath("$.data.applyPromotionCode.cart.promotion.code").isEqualTo("FREESHIP")
                .jsonPath("$.data.applyPromotionCode.cart.promotion.kind").isEqualTo("FREE_SHIPPING")
                .jsonPath("$.data.applyPromotionCode.cart.promotion.discount.amount").isEqualTo(0);
    }

    @Test
    void aPercentageCodeRoundsHalfUpAndASubtotalOfFiftyEuroCarriesItsOwnShipping() {
        store.send("mutation { addToCart(productId: \"product-03\") { errors { code } } }");

        store.send("""
                mutation { applyPromotionCode(code: "WELCOME10") {
                    cart { subtotal { amount } shipping { amount } total { amount }
                           promotion { discount { amount } } }
                } }
                """)
                .jsonPath("$.data.applyPromotionCode.cart.subtotal.amount").isEqualTo(5599)
                .jsonPath("$.data.applyPromotionCode.cart.shipping.amount").isEqualTo(0)
                .jsonPath("$.data.applyPromotionCode.cart.promotion.discount.amount").isEqualTo(560)
                .jsonPath("$.data.applyPromotionCode.cart.total.amount").isEqualTo(5039);
    }

    @Test
    void applyingASecondCodeReplacesTheFirst() {
        lineOfTwoShirts();
        store.send("mutation { applyPromotionCode(code: \"WELCOME10\") { errors { code } } }");

        store.send("mutation { applyPromotionCode(code: \"FREESHIP\") { cart { promotion { code } } } }")
                .jsonPath("$.data.applyPromotionCode.cart.promotion.code").isEqualTo("FREESHIP");
    }

    @Test
    void refusesEveryCodeTheSeedMakesRefusable() {
        lineOfTwoShirts();

        store.send("mutation { applyPromotionCode(code: \"NOSUCHCODE\") { errors { code field } } }")
                .jsonPath("$.data.applyPromotionCode.errors[0].code").isEqualTo("CODE_UNKNOWN")
                .jsonPath("$.data.applyPromotionCode.errors[0].field").isEqualTo("code");
        store.send("mutation { applyPromotionCode(code: \"SUMMER2025\") { errors { code } } }")
                .jsonPath("$.data.applyPromotionCode.errors[0].code").isEqualTo("CODE_EXPIRED");
        store.send("mutation { applyPromotionCode(code: \"ONCE\") { errors { code } } }")
                .jsonPath("$.data.applyPromotionCode.errors[0].code").isEqualTo("CODE_EXHAUSTED");
        store.send("mutation { applyPromotionCode(code: \"FIVEOFF\") { errors { code } } }")
                .jsonPath("$.data.applyPromotionCode.errors[0].code").isEqualTo("CODE_MINIMUM_NOT_MET");
    }

    @Test
    void removesTheCodeAndAnswersTheUnchangedCartWhenThereIsNone() {
        lineOfTwoShirts();
        store.send("mutation { applyPromotionCode(code: \"FREESHIP\") { errors { code } } }");

        store.send("mutation { removePromotionCode { cart { promotion { code } total { amount } } errors { code } } }")
                .jsonPath("$.data.removePromotionCode.cart.promotion").doesNotExist()
                .jsonPath("$.data.removePromotionCode.cart.total.amount").isEqualTo(2465)
                .jsonPath("$.data.removePromotionCode.errors.length()").isEqualTo(0);
        store.send("mutation { removePromotionCode { errors { code } } }")
                .jsonPath("$.data.removePromotionCode.errors.length()").isEqualTo(0);
    }

    private String lineOfTwoShirts() {
        return store.valueOf("""
                mutation { addToCart(productId: "product-18", quantity: 2) {
                    cart { lines { id } } errors { code }
                } }
                """, "$.data.addToCart.cart.lines[0].id");
    }
}
