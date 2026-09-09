package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.WishlistRepository;
import com.zappymart.domain.accounts.Wishlist;
import com.zappymart.domain.cart.Cart;

import java.util.Optional;

public final class AnonymousHandover {

    private final CurrentCart currentCart;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final IdentifierGenerator identifierGenerator;
    private final Clock clock;

    public AnonymousHandover(CurrentCart currentCart, CartRepository cartRepository,
                             WishlistRepository wishlistRepository, IdentifierGenerator identifierGenerator,
                             Clock clock) {
        this.currentCart = currentCart;
        this.cartRepository = cartRepository;
        this.wishlistRepository = wishlistRepository;
        this.identifierGenerator = identifierGenerator;
        this.clock = clock;
    }

    public void toCustomer(Visitor visitor, String customerId) {
        handOverTheCart(visitor, customerId);
        handOverTheWishlist(visitor, customerId);
    }

    private void handOverTheCart(Visitor visitor, String customerId) {
        Optional<Cart> anonymous = currentCart.anonymousCart(visitor);
        if (anonymous.isEmpty()) {
            return;
        }
        Optional<Cart> existing = cartRepository.ofCustomer(customerId);
        if (existing.isEmpty()) {
            cartRepository.save(anonymous.get().belongingTo(customerId, clock.now()));
            return;
        }
        cartRepository.save(existing.get().absorbing(anonymous.get(), identifierGenerator::next, clock.now()));
        cartRepository.delete(anonymous.get().id());
    }

    private void handOverTheWishlist(Visitor visitor, String customerId) {
        if (visitor.cartId() == null || visitor.cartId().equals(customerId)) {
            return;
        }
        Wishlist anonymous = wishlistRepository.ofOwner(visitor.cartId());
        if (anonymous.productIds().isEmpty()) {
            return;
        }
        wishlistRepository.save(wishlistRepository.ofOwner(customerId).absorbing(anonymous));
        wishlistRepository.delete(visitor.cartId());
    }
}
