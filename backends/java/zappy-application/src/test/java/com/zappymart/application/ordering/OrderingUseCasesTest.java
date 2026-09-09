package com.zappymart.application.ordering;

import com.zappymart.application.Page;
import com.zappymart.application.Visitor;
import com.zappymart.application.cart.AddToCart;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.fakes.TheStore;
import com.zappymart.application.promotions.ApplyPromotionCode;
import com.zappymart.domain.ordering.Order;
import com.zappymart.domain.ordering.OrderPlaced;
import com.zappymart.domain.shared.Money;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserError;
import com.zappymart.domain.shared.UserErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.zappymart.application.fakes.SeedLikeData.FREE_SHIPPING;
import static com.zappymart.application.fakes.SeedLikeData.JANE;
import static com.zappymart.application.fakes.SeedLikeData.LAST_DRIVE;
import static com.zappymart.application.fakes.SeedLikeData.SHIRT;
import static org.assertj.core.api.Assertions.assertThat;

class OrderingUseCasesTest {

    private final TheStore store = new TheStore().holding(SHIRT, LAST_DRIVE).offering(FREE_SHIPPING).knowing(JANE);

    private final Visitor jane = new Visitor("cart-cookie", "customer-01", "session-01", "curl",
            "http://localhost:5173");

    private CurrentCart currentCart;
    private AddToCart addToCart;
    private PlaceOrder placeOrder;
    private ListOrders listOrders;
    private FindOrder findOrder;

    @BeforeEach
    void wireTheUseCases() {
        currentCart = new CurrentCart(store.cartRepository, store.identifierGenerator, store.clock);
        addToCart = new AddToCart(store.unitOfWork, currentCart, store.cartRepository, store.productRepository,
                store.identifierGenerator, store.clock);
        placeOrder = new PlaceOrder(store.unitOfWork, currentCart, store.cartRepository, store.orderRepository,
                store.productRepository, store.domainEventPublisher, store.identifierGenerator, store.clock);
        listOrders = new ListOrders(store.orderRepository);
        findOrder = new FindOrder(store.orderRepository);
    }

    @Test
    void placesAnOrderReservesTheStockEmptiesTheCartAndRaisesTheEvent() {
        addToCart.execute(jane, SHIRT.id(), 2);

        Order order = placeOrder.execute(jane).valueOrThrow();

        assertThat(order.number()).isEqualTo("ZM-000001");
        assertThat(order.total()).isEqualTo(Money.euro(2465));
        assertThat(store.products.get(SHIRT.id()).stock()).isEqualTo(23);
        assertThat(currentCart.forVisitor(jane).lines()).isEmpty();
        assertThat(store.publishedEvents).singleElement().isInstanceOf(OrderPlaced.class);
    }

    @Test
    void keepsThePromotionCodeAndTheShippingOfTheMoment() {
        addToCart.execute(jane, SHIRT.id(), 2);
        new ApplyPromotionCode(store.unitOfWork, currentCart, store.cartRepository, store.promotionRepository,
                store.clock).execute(jane, "FREESHIP");

        Order order = placeOrder.execute(jane).valueOrThrow();

        assertThat(order.promotionCode()).isEqualTo("FREESHIP");
        assertThat(order.shipping()).isEqualTo(Money.zero());
        assertThat(order.total()).isEqualTo(Money.euro(1970));
    }

    @Test
    void refusesAnEmptyCartAndAnUnknownVisitor() {
        assertThat(reasonOf(placeOrder.execute(jane))).isEqualTo(UserErrorCode.CART_EMPTY);

        Visitor anonymous = new Visitor("cart-cookie", null, null, "curl", null);

        assertThat(reasonOf(placeOrder.execute(anonymous))).isEqualTo(UserErrorCode.NOT_AUTHENTICATED);
        assertThat(store.publishedEvents).isEmpty();
    }

    @Test
    void refusesWhenTheStockRanOutBetweenAddingAndPaying() {
        addToCart.execute(jane, LAST_DRIVE.id(), 1);
        store.productRepository.reduceStock(LAST_DRIVE.id(), 1);

        assertThat(reasonOf(placeOrder.execute(jane))).isEqualTo(UserErrorCode.OUT_OF_STOCK);
        assertThat(store.orders).isEmpty();
    }

    @Test
    void listsTheOrdersOfTheCustomerAndFindsOneById() {
        addToCart.execute(jane, SHIRT.id(), 2);
        Order order = placeOrder.execute(jane).valueOrThrow();

        Page<Order> page = listOrders.execute(jane, 10, null);

        assertThat(page.items()).extracting(Order::id).containsExactly(order.id());
        assertThat(page.totalCount()).isEqualTo(1);
        assertThat(listOrders.execute(jane, 10, order.id()).items()).isEmpty();
        assertThat(listOrders.execute(jane, 10, "order-that-is-not-there").items()).isEmpty();
        assertThat(findOrder.execute(jane, order.id())).contains(order);
        assertThat(findOrder.execute(jane, "order-that-is-not-there")).isEmpty();
    }

    @Test
    void answersNothingToAVisitorWhoIsNotSignedIn() {
        Visitor anonymous = new Visitor("cart-cookie", null, null, "curl", null);

        assertThat(listOrders.execute(anonymous, 10, null).items()).isEmpty();
        assertThat(findOrder.execute(anonymous, "order-01")).isEmpty();
    }

    @Test
    void mailsTheConfirmationWhenAnOrderIsPlaced() {
        addToCart.execute(jane, SHIRT.id(), 2);
        Order order = placeOrder.execute(jane).valueOrThrow();
        SendOrderConfirmation sendOrderConfirmation = new SendOrderConfirmation(store.orderRepository,
                store.customerRepository, store.mailer);

        sendOrderConfirmation.handle(order.placementEvent());

        assertThat(store.sentMail).singleElement().satisfies(message -> {
            assertThat(message.recipient()).isEqualTo("jane@example.com");
            assertThat(message.subject()).contains(order.number());
            assertThat(message.body()).contains("Jane Doe").contains("MBJ Boat Neck").contains("2465");
        });
        assertThat(sendOrderConfirmation.eventType()).isEqualTo(OrderPlaced.class);
    }

    @Test
    void mailsNothingWhenTheOrderOrTheCustomerIsGone() {
        SendOrderConfirmation sendOrderConfirmation = new SendOrderConfirmation(store.orderRepository,
                store.customerRepository, store.mailer);

        sendOrderConfirmation.handle(new OrderPlaced("order-99", "ZM-000099", "customer-01", null, TheStore.NOW));

        assertThat(store.sentMail).isEmpty();
    }

    private static <TValue> UserErrorCode reasonOf(Result<TValue> result) {
        return result.errors().stream().map(UserError::code).findFirst().orElseThrow();
    }
}
