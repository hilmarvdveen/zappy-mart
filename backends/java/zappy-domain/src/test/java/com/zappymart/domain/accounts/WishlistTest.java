package com.zappymart.domain.accounts;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WishlistTest {

    @Test
    void keepsTheNewestSavedProductFirst() {
        Wishlist wishlist = Wishlist.emptyFor("customer-01").wishing("product-05").wishing("product-09");

        assertThat(wishlist.productIds()).containsExactly("product-09", "product-05");
    }

    @Test
    void savingTheSameProductTwiceChangesNothing() {
        Wishlist wishlist = Wishlist.emptyFor("customer-01").wishing("product-05").wishing("product-05");

        assertThat(wishlist.productIds()).containsExactly("product-05");
    }

    @Test
    void removesAProductAndIgnoresOneThatIsNotThere() {
        Wishlist wishlist = Wishlist.emptyFor("customer-01").wishing("product-05").wishing("product-09");

        assertThat(wishlist.noLongerWishing("product-05").productIds()).containsExactly("product-09");
        assertThat(wishlist.noLongerWishing("product-20").productIds()).containsExactly("product-09", "product-05");
    }

    @Test
    void absorbsAnotherWishlistByAddingAndNeverReplacing() {
        Wishlist customers = Wishlist.emptyFor("customer-01").wishing("product-01");
        Wishlist anonymous = Wishlist.emptyFor("cart-01").wishing("product-05").wishing("product-09");

        Wishlist merged = customers.absorbing(anonymous);

        assertThat(merged.ownerId()).isEqualTo("customer-01");
        assertThat(merged.productIds()).containsExactly("product-09", "product-05", "product-01");
    }
}
