package com.zappymart.application.catalogue;

import com.zappymart.application.Page;
import com.zappymart.application.fakes.TheStore;
import com.zappymart.domain.catalogue.Product;
import org.junit.jupiter.api.Test;

import static com.zappymart.application.fakes.SeedLikeData.LAST_DRIVE;
import static com.zappymart.application.fakes.SeedLikeData.SHIRT;
import static com.zappymart.application.fakes.SeedLikeData.SOLD_OUT_RING;
import static org.assertj.core.api.Assertions.assertThat;

class ListProductsTest {

    private final TheStore store = new TheStore().holding(SHIRT, LAST_DRIVE, SOLD_OUT_RING);

    private final ListProducts listProducts = new ListProducts(store.productRepository);

    @Test
    void answersTheCatalogueInItsOwnOrder() {
        Page<Product> page = listProducts.execute(ProductFilter.everything(), 24, null);

        assertThat(page.items()).extracting(Product::id)
                .containsExactly("product-18", "product-12", "product-07");
        assertThat(page.totalCount()).isEqualTo(3);
        assertThat(page.hasNextPage()).isFalse();
    }

    @Test
    void pagesForwardFromACursor() {
        Page<Product> firstPage = listProducts.execute(ProductFilter.everything(), 2, null);

        assertThat(firstPage.items()).hasSize(2);
        assertThat(firstPage.hasNextPage()).isTrue();

        Page<Product> secondPage = listProducts.execute(ProductFilter.everything(), 2, "product-12");

        assertThat(secondPage.items()).extracting(Product::id).containsExactly("product-07");
        assertThat(secondPage.hasNextPage()).isFalse();
    }

    @Test
    void answersAnEmptyPageForACursorThatIsNotInTheList() {
        Page<Product> page = listProducts.execute(ProductFilter.everything(), 24, "product-99");

        assertThat(page.items()).isEmpty();
        assertThat(page.totalCount()).isEqualTo(3);
    }

    @Test
    void keepsAtMostOneHundredProductsOnOnePage() {
        Page<Product> page = listProducts.execute(ProductFilter.everything(), 5000, null);

        assertThat(page.items()).hasSize(3);
    }

    @Test
    void narrowsByCategoryByNameAndByStock() {
        assertThat(listProducts.execute(new ProductFilter("electronics", null, null), 24, null).items())
                .extracting(Product::id).containsExactly("product-12");
        assertThat(listProducts.execute(new ProductFilter(null, "gaming", null), 24, null).items())
                .extracting(Product::id).containsExactly("product-12");
        assertThat(listProducts.execute(new ProductFilter(null, null, true), 24, null).items())
                .extracting(Product::id).containsExactly("product-18", "product-12");
        assertThat(listProducts.execute(new ProductFilter(null, null, false), 24, null).totalCount())
                .isEqualTo(3);
    }
}
