package com.zappymart.application.cart;

import com.zappymart.application.Visitor;
import com.zappymart.application.fakes.TheStore;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserError;
import com.zappymart.domain.shared.UserErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.zappymart.application.fakes.SeedLikeData.LAST_DRIVE;
import static com.zappymart.application.fakes.SeedLikeData.SHIRT;
import static com.zappymart.application.fakes.SeedLikeData.SOLD_OUT_RING;
import static org.assertj.core.api.Assertions.assertThat;

class CartUseCasesTest {

    private final TheStore store = new TheStore().holding(SHIRT, LAST_DRIVE, SOLD_OUT_RING);

    private CurrentCart currentCart;
    private ViewCart viewCart;
    private AddToCart addToCart;
    private ChangeCartLineQuantity changeCartLineQuantity;
    private RemoveCartLine removeCartLine;

    private final Visitor anonymous = new Visitor("cart-cookie", null, null, "curl", "http://localhost:5173");

    @BeforeEach
    void wireTheUseCases() {
        currentCart = new CurrentCart(store.cartRepository, store.identifierGenerator, store.clock);
        viewCart = new ViewCart(currentCart);
        addToCart = new AddToCart(store.unitOfWork, currentCart, store.cartRepository, store.productRepository,
                store.identifierGenerator, store.clock);
        changeCartLineQuantity = new ChangeCartLineQuantity(store.unitOfWork, currentCart, store.cartRepository,
                store.clock);
        removeCartLine = new RemoveCartLine(store.unitOfWork, currentCart, store.cartRepository, store.clock);
    }

    @Test
    void aVisitorWithoutACartSeesAnEmptyOneWithTheCookieAsItsIdentity() {
        Cart cart = viewCart.execute(anonymous);

        assertThat(cart.id()).isEqualTo("cart-cookie");
        assertThat(cart.lines()).isEmpty();
        assertThat(cart.total()).isEqualTo(Money.zero());
    }

    @Test
    void addsAProductAndKeepsTheCart() {
        Cart cart = addToCart.execute(anonymous, SHIRT.id(), 2).valueOrThrow();

        assertThat(cart.subtotal()).isEqualTo(Money.euro(1970));
        assertThat(store.carts).containsKey("cart-cookie");
        assertThat(viewCart.execute(anonymous).lines()).hasSize(1);
    }

    @Test
    void refusesAProductThatDoesNotExist() {
        Result<Cart> result = addToCart.execute(anonymous, "product-99", 1);

        assertThat(reasonOf(result)).isEqualTo(UserErrorCode.PRODUCT_NOT_FOUND);
    }

    @Test
    void refusesMoreThanTheStockAndLeavesTheCartAlone() {
        addToCart.execute(anonymous, LAST_DRIVE.id(), 1);

        Result<Cart> result = addToCart.execute(anonymous, LAST_DRIVE.id(), 1);

        assertThat(reasonOf(result)).isEqualTo(UserErrorCode.OUT_OF_STOCK);
        assertThat(viewCart.execute(anonymous).lines().getFirst().quantity()).isEqualTo(1);
    }

    @Test
    void refusesAProductWithNoStockAtAll() {
        assertThat(reasonOf(addToCart.execute(anonymous, SOLD_OUT_RING.id(), 1)))
                .isEqualTo(UserErrorCode.OUT_OF_STOCK);
    }

    @Test
    void changesAndRemovesALine() {
        Cart cart = addToCart.execute(anonymous, SHIRT.id(), 1).valueOrThrow();
        String lineId = cart.lines().getFirst().id();

        assertThat(changeCartLineQuantity.execute(anonymous, lineId, 3).valueOrThrow()
                .lines().getFirst().quantity()).isEqualTo(3);
        assertThat(removeCartLine.execute(anonymous, lineId).valueOrThrow().lines()).isEmpty();
        assertThat(reasonOf(removeCartLine.execute(anonymous, lineId)))
                .isEqualTo(UserErrorCode.CART_LINE_NOT_FOUND);
    }

    @Test
    void aSignedInVisitorGetsTheCartOfTheCustomer() {
        Visitor signedIn = new Visitor("cart-cookie", "customer-01", "session-01", "curl",
                "http://localhost:5173");

        Cart cart = addToCart.execute(signedIn, SHIRT.id(), 1).valueOrThrow();

        assertThat(cart.customerId()).isEqualTo("customer-01");
        assertThat(cart.id()).isEqualTo("generated-1");
    }

    private static UserErrorCode reasonOf(Result<Cart> result) {
        return result.errors().stream().map(UserError::code).findFirst().orElseThrow();
    }
}
