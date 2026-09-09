package com.zappymart.domain.cart;

import com.zappymart.domain.builders.CartBuilder;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.promotions.PromotionRule;
import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserError;
import com.zappymart.domain.shared.UserErrorCode;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static com.zappymart.domain.builders.CartBuilder.aCart;
import static com.zappymart.domain.builders.ProductBuilder.aProduct;
import static org.assertj.core.api.Assertions.assertThat;

class CartTest {

    private static final Instant NOW = CartBuilder.A_MOMENT;

    private static final Product SHIRT = aProduct().withId("product-18").named("MBJ Boat Neck")
            .costing(985).withStock(25).build();

    private static final Product JACKET = aProduct().withId("product-03").named("Mens Cotton Jacket")
            .costing(5599).withStock(8).build();

    private static final Product LAST_ONE = aProduct().withId("product-12").named("WD 4TB Gaming Drive")
            .costing(11400).withStock(1).build();

    @Test
    void anEmptyCartPaysNothingAtAll() {
        Cart cart = aCart().build();

        assertThat(cart.subtotal()).isEqualTo(Money.zero());
        assertThat(cart.shipping()).isEqualTo(Money.zero());
        assertThat(cart.total()).isEqualTo(Money.zero());
    }

    @Test
    void addsALineAndDerivesTheTotals() {
        Cart cart = aCart().build().add("line-1", SHIRT, 2, NOW).valueOrThrow();

        assertThat(cart.lines()).hasSize(1);
        assertThat(cart.subtotal()).isEqualTo(Money.euro(1970));
        assertThat(cart.shipping()).isEqualTo(Money.euro(495));
        assertThat(cart.total()).isEqualTo(Money.euro(2465));
    }

    @Test
    void raisesTheQuantityWhenTheProductIsAlreadyOnALine() {
        Cart cart = aCart().holding(SHIRT, 2).build().add("line-2", SHIRT, 3, NOW).valueOrThrow();

        assertThat(cart.lines()).hasSize(1);
        assertThat(cart.lines().getFirst().quantity()).isEqualTo(5);
    }

    @Test
    void refusesAQuantityBelowOne() {
        Result<Cart> result = aCart().build().add("line-1", SHIRT, 0, NOW);

        assertThat(reasonOf(result)).isEqualTo(UserErrorCode.QUANTITY_INVALID);
    }

    @Test
    void refusesMoreThanTheStock() {
        Result<Cart> result = aCart().holding(LAST_ONE, 1).build().add("line-2", LAST_ONE, 1, NOW);

        assertThat(reasonOf(result)).isEqualTo(UserErrorCode.OUT_OF_STOCK);
    }

    @Test
    void changesTheQuantityOfALine() {
        Cart cart = aCart().holding(SHIRT, 2).build().changeLineQuantity("line-1", 4, NOW).valueOrThrow();

        assertThat(cart.lines().getFirst().quantity()).isEqualTo(4);
    }

    @Test
    void refusesAQuantityChangeToZeroAndPointsAtRemoval() {
        Result<Cart> result = aCart().holding(SHIRT, 2).build().changeLineQuantity("line-1", 0, NOW);

        assertThat(reasonOf(result)).isEqualTo(UserErrorCode.QUANTITY_INVALID);
    }

    @Test
    void refusesToChangeOrRemoveALineThatIsNotThere() {
        Cart cart = aCart().holding(SHIRT, 2).build();

        assertThat(reasonOf(cart.changeLineQuantity("line-9", 1, NOW)))
                .isEqualTo(UserErrorCode.CART_LINE_NOT_FOUND);
        assertThat(reasonOf(cart.removeLine("line-9", NOW))).isEqualTo(UserErrorCode.CART_LINE_NOT_FOUND);
    }

    @Test
    void removesALineAndDropsThePromotionWithTheLastLine() {
        Cart cart = aCart().holding(SHIRT, 2).withPromotion("WELCOME10", new PromotionRule.PercentageOff(10))
                .build().removeLine("line-1", NOW).valueOrThrow();

        assertThat(cart.lines()).isEmpty();
        assertThat(cart.promotion()).isNull();
        assertThat(cart.total()).isEqualTo(Money.zero());
    }

    @Test
    void aFreeShippingCodeShowsInTheShippingAndNotInADiscount() {
        Cart cart = aCart().holding(SHIRT, 2)
                .withPromotion("FREESHIP", new PromotionRule.FreeShipping()).build();

        assertThat(cart.subtotal()).isEqualTo(Money.euro(1970));
        assertThat(cart.shipping()).isEqualTo(Money.zero());
        assertThat(cart.discount()).isEqualTo(Money.zero());
        assertThat(cart.total()).isEqualTo(Money.euro(1970));
    }

    @Test
    void aPercentageCodeTakesItsShareAndASubtotalAboveFiftyEuroCarriesItsOwnShipping() {
        Cart cart = aCart().holding(JACKET, 1)
                .withPromotion("WELCOME10", new PromotionRule.PercentageOff(10)).build();

        assertThat(cart.subtotal()).isEqualTo(Money.euro(5599));
        assertThat(cart.shipping()).isEqualTo(Money.zero());
        assertThat(cart.discount()).isEqualTo(Money.euro(560));
        assertThat(cart.total()).isEqualTo(Money.euro(5039));
    }

    @Test
    void aFixedAmountCodeNeverTakesMoreThanTheSubtotal() {
        Cart cart = aCart().holding(SHIRT, 1)
                .withPromotion("FIVEOFF", new PromotionRule.FixedAmountOff(Money.euro(5000))).build();

        assertThat(cart.discount()).isEqualTo(Money.euro(985));
        assertThat(cart.total()).isEqualTo(Money.euro(495));
    }

    @Test
    void recalculatesTheDiscountWhenTheLinesChange() {
        Cart cart = aCart().holding(SHIRT, 1)
                .withPromotion("WELCOME10", new PromotionRule.PercentageOff(10)).build();

        assertThat(cart.discount()).isEqualTo(Money.euro(99));

        Cart larger = cart.changeLineQuantity("line-1", 2, NOW).valueOrThrow();

        assertThat(larger.discount()).isEqualTo(Money.euro(197));
    }

    @Test
    void absorbsAnotherCartByRaisingQuantitiesAndKeepingItsCode() {
        Cart anonymous = aCart().withId("cart-anonymous").holding(SHIRT, 3)
                .withPromotion("FREESHIP", new PromotionRule.FreeShipping()).build();
        Cart customers = aCart().withId("cart-customer").ownedBy("customer-01").holding(SHIRT, 2).build();

        Cart merged = customers.absorbing(anonymous, () -> "line-new", NOW);

        assertThat(merged.id()).isEqualTo("cart-customer");
        assertThat(merged.lines()).hasSize(1);
        assertThat(merged.lines().getFirst().quantity()).isEqualTo(5);
        assertThat(merged.promotion().code()).isEqualTo("FREESHIP");
    }

    @Test
    void emptiesAndMovesToACustomer() {
        Cart cart = aCart().holding(SHIRT, 2).build();

        assertThat(cart.emptied(NOW).lines()).isEmpty();
        assertThat(cart.belongingTo("customer-01", NOW).customerId()).isEqualTo("customer-01");
        assertThat(cart.withoutPromotion(NOW).promotion()).isNull();
    }

    private static UserErrorCode reasonOf(Result<Cart> result) {
        return result.errors().stream().map(UserError::code).findFirst().orElseThrow();
    }
}
