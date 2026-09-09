package com.zappymart.application.promotions;

import com.zappymart.application.Visitor;
import com.zappymart.application.cart.AddToCart;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.fakes.TheStore;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.ordering.OrderPlaced;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserError;
import com.zappymart.domain.shared.UserErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.zappymart.application.fakes.SeedLikeData.FREE_SHIPPING;
import static com.zappymart.application.fakes.SeedLikeData.SHIRT;
import static com.zappymart.application.fakes.SeedLikeData.SUMMER_LAST_YEAR;
import static com.zappymart.application.fakes.SeedLikeData.WELCOME_TEN;
import static org.assertj.core.api.Assertions.assertThat;

class PromotionUseCasesTest {

    private final TheStore store = new TheStore()
            .holding(SHIRT)
            .offering(WELCOME_TEN, FREE_SHIPPING, SUMMER_LAST_YEAR);

    private final Visitor anonymous = new Visitor("cart-cookie", null, null, "curl", "http://localhost:5173");

    private ApplyPromotionCode applyPromotionCode;
    private RemovePromotionCode removePromotionCode;

    @BeforeEach
    void wireTheUseCasesAndFillTheCart() {
        CurrentCart currentCart = new CurrentCart(store.cartRepository, store.identifierGenerator, store.clock);
        applyPromotionCode = new ApplyPromotionCode(store.unitOfWork, currentCart, store.cartRepository,
                store.promotionRepository, store.clock);
        removePromotionCode = new RemovePromotionCode(store.unitOfWork, currentCart, store.cartRepository,
                store.clock);
        new AddToCart(store.unitOfWork, currentCart, store.cartRepository, store.productRepository,
                store.identifierGenerator, store.clock).execute(anonymous, SHIRT.id(), 2);
    }

    @Test
    void appliesAPercentageCodeTypedInAnyCase() {
        Cart cart = applyPromotionCode.execute(anonymous, " welcome10 ").valueOrThrow();

        assertThat(cart.promotion().code()).isEqualTo("WELCOME10");
        assertThat(cart.discount()).isEqualTo(Money.euro(197));
        assertThat(cart.total()).isEqualTo(Money.euro(2268));
    }

    @Test
    void replacesTheCodeThatWasThere() {
        applyPromotionCode.execute(anonymous, "WELCOME10");

        Cart cart = applyPromotionCode.execute(anonymous, "FREESHIP").valueOrThrow();

        assertThat(cart.promotion().code()).isEqualTo("FREESHIP");
        assertThat(cart.shipping()).isEqualTo(Money.zero());
        assertThat(cart.total()).isEqualTo(Money.euro(1970));
    }

    @Test
    void refusesAnUnknownAndAnExpiredCodeAndKeepsWhatTheCartHad() {
        applyPromotionCode.execute(anonymous, "WELCOME10");

        assertThat(reasonOf(applyPromotionCode.execute(anonymous, "NOSUCHCODE")))
                .isEqualTo(UserErrorCode.CODE_UNKNOWN);
        assertThat(reasonOf(applyPromotionCode.execute(anonymous, "SUMMER2025")))
                .isEqualTo(UserErrorCode.CODE_EXPIRED);
        assertThat(reasonOf(applyPromotionCode.execute(anonymous, "   ")))
                .isEqualTo(UserErrorCode.CODE_UNKNOWN);
        assertThat(store.carts.get("cart-cookie").promotion().code()).isEqualTo("WELCOME10");
    }

    @Test
    void removesTheCodeAndDoesNothingWhenThereIsNone() {
        applyPromotionCode.execute(anonymous, "WELCOME10");

        assertThat(removePromotionCode.execute(anonymous).valueOrThrow().promotion()).isNull();
        assertThat(removePromotionCode.execute(anonymous).valueOrThrow().promotion()).isNull();
    }

    @Test
    void countsOneUseWhenAnOrderWithACodeIsPlaced() {
        CountPromotionUse countPromotionUse = new CountPromotionUse(store.unitOfWork, store.promotionRepository);

        countPromotionUse.handle(new OrderPlaced("order-01", "ZM-000001", "customer-01", "WELCOME10",
                TheStore.NOW));

        assertThat(store.promotionRepository.byCode(new PromotionCode("WELCOME10")).orElseThrow().timesUsed())
                .isEqualTo(1);
        assertThat(countPromotionUse.eventType()).isEqualTo(OrderPlaced.class);
    }

    @Test
    void countsNothingWhenTheOrderCarriedNoCode() {
        CountPromotionUse countPromotionUse = new CountPromotionUse(store.unitOfWork, store.promotionRepository);

        countPromotionUse.handle(new OrderPlaced("order-01", "ZM-000001", "customer-01", null, TheStore.NOW));

        assertThat(store.promotionRepository.byCode(new PromotionCode("WELCOME10")).orElseThrow().timesUsed())
                .isZero();
    }

    private static UserErrorCode reasonOf(Result<Cart> result) {
        return result.errors().stream().map(UserError::code).findFirst().orElseThrow();
    }
}
