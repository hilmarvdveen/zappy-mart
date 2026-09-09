package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.application.ports.WishlistRepository;
import com.zappymart.domain.accounts.Wishlist;
import com.zappymart.domain.catalogue.Product;

import java.util.List;

public final class ViewWishlist {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;

    public ViewWishlist(WishlistRepository wishlistRepository, ProductRepository productRepository) {
        this.wishlistRepository = wishlistRepository;
        this.productRepository = productRepository;
    }

    public List<Product> execute(Visitor visitor) {
        return forOwner(WishlistOwner.of(visitor));
    }

    public List<Product> forOwner(String ownerId) {
        if (ownerId == null) {
            return List.of();
        }
        return productsOf(wishlistRepository.ofOwner(ownerId));
    }

    public List<Product> productsOf(Wishlist wishlist) {
        List<Product> saved = productRepository.byIds(wishlist.productIds());
        return wishlist.productIds().stream()
                .flatMap(productId -> saved.stream().filter(product -> product.id().equals(productId)))
                .toList();
    }
}
