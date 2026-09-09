package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.application.ports.WishlistRepository;
import com.zappymart.domain.accounts.Wishlist;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Result;

import java.util.List;

public final class RemoveFromWishlist {

    private final UnitOfWork unitOfWork;
    private final WishlistRepository wishlistRepository;
    private final ViewWishlist viewWishlist;

    public RemoveFromWishlist(UnitOfWork unitOfWork, WishlistRepository wishlistRepository,
                              ViewWishlist viewWishlist) {
        this.unitOfWork = unitOfWork;
        this.wishlistRepository = wishlistRepository;
        this.viewWishlist = viewWishlist;
    }

    public Result<List<Product>> execute(Visitor visitor, String productId) {
        String ownerId = WishlistOwner.of(visitor);
        return unitOfWork.inTransaction(() -> {
            Wishlist saved = wishlistRepository.save(
                    wishlistRepository.ofOwner(ownerId).noLongerWishing(productId));
            return Result.of(viewWishlist.productsOf(saved));
        });
    }
}
