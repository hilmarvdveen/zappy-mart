package com.zappymart.adapters.seed;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class SeedFilesTest {

    private final SeedFiles seedFiles = new SeedFiles();

    @Test
    void readsTheFourCategoriesInTheOrderTheContractFixes() {
        assertThat(seedFiles.categories()).extracting(SeedCategory::slug)
                .containsExactly("mens-clothing", "jewellery", "electronics", "womens-clothing");
    }

    @Test
    void readsTwentyProductsInCatalogueOrderWithPricesInCents() {
        assertThat(seedFiles.products()).hasSize(20);
        assertThat(seedFiles.products().getFirst().id()).isEqualTo("product-01");
        assertThat(seedFiles.products().getLast().id()).isEqualTo("product-20");
        assertThat(seedFiles.products().getFirst().price().amount()).isEqualTo(10995);
        assertThat(seedFiles.products().getFirst().price().currency()).isEqualTo("EUR");
    }

    @Test
    void readsTheTwoStockValuesTheConformanceRunLeansOn() {
        assertThat(productWithId("product-07").stock()).isZero();
        assertThat(productWithId("product-12").stock()).isEqualTo(1);
        assertThat(seedFiles.products().stream().filter(product -> product.stock() == 0).count()).isEqualTo(1);
    }

    @Test
    void readsTheFivePromotionCodesWithTheirWindows() {
        assertThat(seedFiles.promotionCodes()).extracting(SeedPromotion::code)
                .containsExactly("WELCOME10", "FIVEOFF", "FREESHIP", "SUMMER2025", "ONCE");
        assertThat(promotionWithCode("FIVEOFF").minimumSubtotal().amount()).isEqualTo(2500);
        assertThat(promotionWithCode("ONCE").usageLimit()).isEqualTo(1);
        assertThat(promotionWithCode("ONCE").timesUsed()).isEqualTo(1);
        assertThat(Instant.parse(promotionWithCode("SUMMER2025").validUntil()))
                .isEqualTo(Instant.parse("2025-08-31T23:59:59Z"));
    }

    @Test
    void readsTheOneCustomerWithAnEmptyWishlist() {
        assertThat(seedFiles.customers()).singleElement().satisfies(customer -> {
            assertThat(customer.id()).isEqualTo("customer-01");
            assertThat(customer.email()).isEqualTo("jane@example.com");
            assertThat(customer.wishlist()).isEmpty();
        });
    }

    private SeedProduct productWithId(String id) {
        return seedFiles.products().stream()
                .filter(product -> product.id().equals(id))
                .findFirst()
                .orElseThrow();
    }

    private SeedPromotion promotionWithCode(String code) {
        return seedFiles.promotionCodes().stream()
                .filter(promotion -> promotion.code().equals(code))
                .findFirst()
                .orElseThrow();
    }
}
