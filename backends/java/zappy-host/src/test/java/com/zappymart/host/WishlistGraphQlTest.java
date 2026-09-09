package com.zappymart.host;

import org.junit.jupiter.api.Test;

class WishlistGraphQlTest extends StoreTest {

    @Test
    void anAnonymousVisitorKeepsAWishlistAgainstTheCartCookie() {
        store.send("mutation { addToWishlist(productId: \"product-05\") { products { id } errors { code } } }")
                .jsonPath("$.data.addToWishlist.errors.length()").isEqualTo(0)
                .jsonPath("$.data.addToWishlist.products[0].id").isEqualTo("product-05");

        store.send("{ wishlist { id name } }")
                .jsonPath("$.data.wishlist.length()").isEqualTo(1)
                .jsonPath("$.data.wishlist[0].id").isEqualTo("product-05");
    }

    @Test
    void savingTheSameProductTwiceChangesNothingAndTheNewestComesFirst() {
        store.send("mutation { addToWishlist(productId: \"product-05\") { products { id } } }");
        store.send("mutation { addToWishlist(productId: \"product-05\") { products { id } } }")
                .jsonPath("$.data.addToWishlist.products.length()").isEqualTo(1);

        store.send("mutation { addToWishlist(productId: \"product-09\") { products { id } } }")
                .jsonPath("$.data.addToWishlist.products[0].id").isEqualTo("product-09")
                .jsonPath("$.data.addToWishlist.products[1].id").isEqualTo("product-05");
    }

    @Test
    void removesAProductAndAnswersTheUnchangedListForOneThatIsNotThere() {
        store.send("mutation { addToWishlist(productId: \"product-05\") { products { id } } }");

        store.send("mutation { removeFromWishlist(productId: \"product-05\") { products { id } errors { code } } }")
                .jsonPath("$.data.removeFromWishlist.products.length()").isEqualTo(0)
                .jsonPath("$.data.removeFromWishlist.errors.length()").isEqualTo(0);
        store.send("mutation { removeFromWishlist(productId: \"product-20\") { errors { code } } }")
                .jsonPath("$.data.removeFromWishlist.errors.length()").isEqualTo(0);
    }

    @Test
    void refusesAProductThatDoesNotExist() {
        store.send("mutation { addToWishlist(productId: \"product-99\") { errors { code field } } }")
                .jsonPath("$.data.addToWishlist.errors[0].code").isEqualTo("PRODUCT_NOT_FOUND")
                .jsonPath("$.data.addToWishlist.errors[0].field").isEqualTo("productId");
    }

    @Test
    void theAnonymousWishlistMergesIntoTheCustomersOnLoginByAdding() {
        store.send("mutation { addToWishlist(productId: \"product-05\") { products { id } } }");
        store.send("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");

        logInAsJane();

        store.send("{ wishlist { id } me { wishlist { id } } cart { lines { quantity product { id } } } }")
                .jsonPath("$.data.wishlist[0].id").isEqualTo("product-05")
                .jsonPath("$.data.me.wishlist[0].id").isEqualTo("product-05")
                .jsonPath("$.data.cart.lines[0].product.id").isEqualTo("product-18")
                .jsonPath("$.data.cart.lines[0].quantity").isEqualTo(2);
    }
}
