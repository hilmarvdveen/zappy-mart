package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.application.ports.WishlistRepository;
import com.zappymart.domain.accounts.Wishlist;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.util.List;

public final class AddToWishlist {

    private final UnitOfWork unitOfWork;
    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;
    private final ViewWishlist viewWishlist;

    public AddToWishlist(UnitOfWork unitOfWork, WishlistRepository wishlistRepository,
                         ProductRepository productRepository, ViewWishlist viewWishlist) {
        this.unitOfWork = unitOfWork;
        this.wishlistRepository = wishlistRepository;
        this.productRepository = productRepository;
        this.viewWishlist = viewWishlist;
    }

    public Result<List<Product>> execute(Visitor visitor, String productId) {
        String ownerId = WishlistOwner.of(visitor);
        return unitOfWork.inTransaction(() -> {
            if (productRepository.byId(productId).isEmpty()) {
                return Result.refuse(UserErrorCode.PRODUCT_NOT_FOUND,
                        "No product has the id " + productId + ".", "productId");
            }
            Wishlist saved = wishlistRepository.save(wishlistRepository.ofOwner(ownerId).wishing(productId));
            return Result.of(viewWishlist.productsOf(saved));
        });
    }
}
