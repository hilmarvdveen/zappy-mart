package com.zappymart.application.ordering;

import com.zappymart.application.Visitor;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.DomainEventPublisher;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.OrderRepository;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.cart.CartLine;
import com.zappymart.domain.ordering.Order;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

public final class PlaceOrder {

    private final UnitOfWork unitOfWork;
    private final CurrentCart currentCart;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final DomainEventPublisher domainEventPublisher;
    private final IdentifierGenerator identifierGenerator;
    private final Clock clock;

    public PlaceOrder(UnitOfWork unitOfWork, CurrentCart currentCart, CartRepository cartRepository,
                      OrderRepository orderRepository, ProductRepository productRepository,
                      DomainEventPublisher domainEventPublisher, IdentifierGenerator identifierGenerator,
                      Clock clock) {
        this.unitOfWork = unitOfWork;
        this.currentCart = currentCart;
        this.cartRepository = cartRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.domainEventPublisher = domainEventPublisher;
        this.identifierGenerator = identifierGenerator;
        this.clock = clock;
    }

    public Result<Order> execute(Visitor visitor) {
        if (!visitor.isSignedIn()) {
            return Result.refuse(UserErrorCode.NOT_AUTHENTICATED, "Sign in to place an order.");
        }
        Result<Order> placement = unitOfWork.inTransaction(() -> {
            Cart cart = currentCart.forVisitor(visitor);
            Result<Order> placed = Order.place(identifierGenerator.next(), orderRepository.nextOrderNumber(),
                    visitor.customerId(), cart, clock.now());
            if (!placed.succeeded()) {
                return placed;
            }
            for (CartLine line : cart.lines()) {
                productRepository.reduceStock(line.product().id(), line.quantity());
            }
            Order order = orderRepository.save(placed.valueOrThrow());
            cartRepository.save(cart.emptied(clock.now()));
            return Result.of(order);
        });
        placement.asOptional().ifPresent(order -> domainEventPublisher.publish(order.placementEvent()));
        return placement;
    }
}
