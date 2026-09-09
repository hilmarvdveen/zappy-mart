package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.ProductRepository;
import com.zappymart.domain.catalogue.Category;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Money;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class CachedProductRepositoryTest {

    private static final Category ELECTRONICS =
            new Category("category-electronics", "Electronics", "electronics");

    private static final Product DRIVE = new Product("product-12", "WD 4TB Gaming Drive",
            "wd-4tb-gaming-drive-playstation-4", "A drive", Money.euro(11400), ELECTRONICS, 1, null);

    private final AtomicInteger readsFromTheDatabase = new AtomicInteger();

    private final AtomicInteger reducedStock = new AtomicInteger();

    private final ProductRepository behindTheCache = new ProductRepository() {
        @Override
        public List<Product> catalogue() {
            readsFromTheDatabase.incrementAndGet();
            return List.of(DRIVE);
        }

        @Override
        public Optional<Product> byId(String productId) {
            throw new AssertionError("The cache answers this one from the catalogue it remembers");
        }

        @Override
        public Optional<Product> bySlug(String slug) {
            throw new AssertionError("The cache answers this one from the catalogue it remembers");
        }

        @Override
        public List<Product> byIds(Collection<String> productIds) {
            throw new AssertionError("The cache answers this one from the catalogue it remembers");
        }

        @Override
        public void reduceStock(String productId, int quantity) {
            reducedStock.addAndGet(quantity);
        }
    };

    private final CachedProductRepository cache = new CachedProductRepository(behindTheCache);

    @Test
    void readsTheCatalogueOnceAndAnswersEveryQuestionFromIt() {
        assertThat(cache.catalogue()).containsExactly(DRIVE);
        assertThat(cache.catalogue()).containsExactly(DRIVE);
        assertThat(cache.byId("product-12")).contains(DRIVE);
        assertThat(cache.bySlug("wd-4tb-gaming-drive-playstation-4")).contains(DRIVE);
        assertThat(cache.byIds(List.of("product-12"))).containsExactly(DRIVE);
        assertThat(cache.byId("product-99")).isEmpty();

        assertThat(readsFromTheDatabase).hasValue(1);
    }

    @Test
    void readsAgainAfterAStockChange() {
        cache.catalogue();

        cache.reduceStock("product-12", 1);
        cache.catalogue();

        assertThat(reducedStock).hasValue(1);
        assertThat(readsFromTheDatabase).hasValue(2);
    }

    @Test
    void readsAgainAfterTheSeedIsLoadedAgain() {
        cache.catalogue();

        cache.forget();
        cache.catalogue();

        assertThat(readsFromTheDatabase).hasValue(2);
    }
}
