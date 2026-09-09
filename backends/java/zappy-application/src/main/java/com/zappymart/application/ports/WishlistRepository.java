package com.zappymart.application.ports;

import com.zappymart.domain.accounts.Wishlist;

public interface WishlistRepository {

    Wishlist ofOwner(String ownerId);

    Wishlist save(Wishlist wishlist);

    void delete(String ownerId);
}
