package com.zappymart.domain.ordering;

import com.zappymart.domain.builders.CartBuilder;
import com.zappymart.domain.cart.Cart;
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

class OrderTest {

    private static final Instant NOW = CartBuilder.A_MOMENT;

    private static final Product SHIRT = aProduct().withId("product-18").named("MBJ Boat Neck")
            .costing(985).withStock(25).build();

    @Test
    void placesAnOrderThatKeepsTheNamesAndPricesOfTheMoment() {
        Cart cart = aCart().ownedBy("customer-01").holding(SHIRT, 2).build();

        Order order = Order.place("order-01", "ZM-000001", "customer-01", cart, NOW).valueOrThrow();

        assertThat(order.status()).isEqualTo(OrderStatus.PAID);
        assertThat(order.lines()).singleElement().satisfies(line -> {
            assertThat(line.productName()).isEqualTo("MBJ Boat Neck");
            assertThat(line.unitPrice()).isEqualTo(Money.euro(985));
            assertThat(line.lineTotal()).isEqualTo(Money.euro(1970));
        });
        assertThat(order.subtotal()).isEqualTo(Money.euro(1970));
        assertThat(order.shipping()).isEqualTo(Money.euro(495));
        assertThat(order.discount()).isEqualTo(Money.zero());
        assertThat(order.total()).isEqualTo(Money.euro(2465));
        assertThat(order.promotionCode()).isNull();
        assertThat(order.placedAt()).isEqualTo(NOW);
    }

    @Test
    void copiesThePromotionCodeAsText() {
        Cart cart = aCart().ownedBy("customer-01").holding(SHIRT, 2)
                .withPromotion("FREESHIP", new PromotionRule.FreeShipping()).build();

        Order order = Order.place("order-01", "ZM-000001", "customer-01", cart, NOW).valueOrThrow();

        assertThat(order.promotionCode()).isEqualTo("FREESHIP");
        assertThat(order.shipping()).isEqualTo(Money.zero());
        assertThat(order.total()).isEqualTo(Money.euro(1970));
    }

    @Test
    void refusesAnEmptyCart() {
        Result<Order> result = Order.place("order-01", "ZM-000001", "customer-01", aCart().build(), NOW);

        assertThat(reasonOf(result)).isEqualTo(UserErrorCode.CART_EMPTY);
    }

    @Test
    void refusesWhenOneLineHasOutrunItsStock() {
        Product lastOne = aProduct().withId("product-12").named("WD 4TB Gaming Drive").withStock(1).build();
        Cart cart = aCart().ownedBy("customer-01").holding(SHIRT, 1).holding(lastOne, 2).build();

        Result<Order> result = Order.place("order-01", "ZM-000001", "customer-01", cart, NOW);

        assertThat(reasonOf(result)).isEqualTo(UserErrorCode.OUT_OF_STOCK);
        assertThat(result.errors().getFirst().message()).contains("WD 4TB Gaming Drive");
    }

    @Test
    void carriesItsPlacementEvent() {
        Cart cart = aCart().ownedBy("customer-01").holding(SHIRT, 2)
                .withPromotion("WELCOME10", new PromotionRule.PercentageOff(10)).build();

        OrderPlaced event = Order.place("order-01", "ZM-000001", "customer-01", cart, NOW)
                .valueOrThrow().placementEvent();

        assertThat(event.orderId()).isEqualTo("order-01");
        assertThat(event.orderNumber()).isEqualTo("ZM-000001");
        assertThat(event.customerId()).isEqualTo("customer-01");
        assertThat(event.promotionCode()).isEqualTo("WELCOME10");
        assertThat(event.occurredAt()).isEqualTo(NOW);
    }

    private static UserErrorCode reasonOf(Result<Order> result) {
        return result.errors().stream().map(UserError::code).findFirst().orElseThrow();
    }
}
