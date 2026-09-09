package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.WishlistRepository;
import com.zappymart.domain.accounts.Wishlist;

import java.util.List;

public final class JpaWishlistRepository implements WishlistRepository {

    private final WishlistEntryRowRepository wishlistEntryRows;

    JpaWishlistRepository(WishlistEntryRowRepository wishlistEntryRows) {
        this.wishlistEntryRows = wishlistEntryRows;
    }

    @Override
    public Wishlist ofOwner(String ownerId) {
        List<String> productIds = wishlistEntryRows.findByOwnerIdOrderByPositionAsc(ownerId).stream()
                .map(row -> row.productId)
                .toList();
        return new Wishlist(ownerId, productIds);
    }

    @Override
    public Wishlist save(Wishlist wishlist) {
        wishlistEntryRows.deleteByOwnerId(wishlist.ownerId());
        wishlistEntryRows.flush();
        List<String> productIds = wishlist.productIds();
        for (int position = 0; position < productIds.size(); position++) {
            wishlistEntryRows.save(new WishlistEntryRow(wishlist.ownerId() + ":" + productIds.get(position),
                    wishlist.ownerId(), productIds.get(position), position));
        }
        return wishlist;
    }

    @Override
    public void delete(String ownerId) {
        wishlistEntryRows.deleteByOwnerId(ownerId);
    }
}
