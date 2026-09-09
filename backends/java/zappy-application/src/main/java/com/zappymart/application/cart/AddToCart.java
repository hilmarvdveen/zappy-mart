package com.zappymart.application.cart;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.util.Optional;

public final class AddToCart {

    private final UnitOfWork unitOfWork;
    private final CurrentCart currentCart;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final IdentifierGenerator identifierGenerator;
    private final Clock clock;

    public AddToCart(UnitOfWork unitOfWork, CurrentCart currentCart, CartRepository cartRepository,
                     ProductRepository productRepository, IdentifierGenerator identifierGenerator, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.currentCart = currentCart;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.identifierGenerator = identifierGenerator;
        this.clock = clock;
    }

    public Result<Cart> execute(Visitor visitor, String productId, int quantity) {
        return unitOfWork.inTransaction(() -> {
            Optional<Product> product = productRepository.byId(productId);
            if (product.isEmpty()) {
                return Result.refuse(UserErrorCode.PRODUCT_NOT_FOUND,
                        "No product has the id " + productId + ".", "productId");
            }
            Cart cart = currentCart.forVisitor(visitor);
            return cart.add(identifierGenerator.next(), product.get(), quantity, clock.now())
                    .map(cartRepository::save);
        });
    }
}
