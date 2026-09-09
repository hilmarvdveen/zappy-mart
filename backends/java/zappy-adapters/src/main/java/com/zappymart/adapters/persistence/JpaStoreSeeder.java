package com.zappymart.adapters.persistence;

import com.zappymart.adapters.seed.SeedCategory;
import com.zappymart.adapters.seed.SeedCustomer;
import com.zappymart.adapters.seed.SeedFiles;
import com.zappymart.adapters.seed.SeedProduct;
import com.zappymart.adapters.seed.SeedPromotion;
import com.zappymart.application.ports.PasswordHasher;
import com.zappymart.application.ports.StoreSeeder;

import java.time.Instant;
import java.util.List;

public final class JpaStoreSeeder implements StoreSeeder {

    private final SeedFiles seedFiles;
    private final PasswordHasher passwordHasher;
    private final CachedProductRepository cachedProductRepository;
    private final CategoryRowRepository categoryRows;
    private final ProductRowRepository productRows;
    private final PromotionRowRepository promotionRows;
    private final CustomerRowRepository customerRows;
    private final WishlistEntryRowRepository wishlistEntryRows;
    private final CartRowRepository cartRows;
    private final CartLineRowRepository cartLineRows;
    private final OrderRowRepository orderRows;
    private final OrderLineRowRepository orderLineRows;
    private final SessionRowRepository sessionRows;
    private final RefreshTokenRowRepository refreshTokenRows;

    JpaStoreSeeder(SeedFiles seedFiles, PasswordHasher passwordHasher,
                   CachedProductRepository cachedProductRepository,
                   CategoryRowRepository categoryRows, ProductRowRepository productRows,
                   PromotionRowRepository promotionRows, CustomerRowRepository customerRows,
                   WishlistEntryRowRepository wishlistEntryRows, CartRowRepository cartRows,
                   CartLineRowRepository cartLineRows, OrderRowRepository orderRows,
                   OrderLineRowRepository orderLineRows, SessionRowRepository sessionRows,
                   RefreshTokenRowRepository refreshTokenRows) {
        this.seedFiles = seedFiles;
        this.passwordHasher = passwordHasher;
        this.cachedProductRepository = cachedProductRepository;
        this.categoryRows = categoryRows;
        this.productRows = productRows;
        this.promotionRows = promotionRows;
        this.customerRows = customerRows;
        this.wishlistEntryRows = wishlistEntryRows;
        this.cartRows = cartRows;
        this.cartLineRows = cartLineRows;
        this.orderRows = orderRows;
        this.orderLineRows = orderLineRows;
        this.sessionRows = sessionRows;
        this.refreshTokenRows = refreshTokenRows;
    }

    @Override
    public int emptyTheStoreAndLoadTheSeed() {
        emptyTheStore();
        loadCategories();
        int loadedProducts = loadProducts();
        loadPromotionCodes();
        loadCustomers();
        cachedProductRepository.forget();
        return loadedProducts;
    }

    private void emptyTheStore() {
        refreshTokenRows.deleteAllInBatch();
        sessionRows.deleteAllInBatch();
        orderLineRows.deleteAllInBatch();
        orderRows.deleteAllInBatch();
        cartLineRows.deleteAllInBatch();
        cartRows.deleteAllInBatch();
        wishlistEntryRows.deleteAllInBatch();
        customerRows.deleteAllInBatch();
        promotionRows.deleteAllInBatch();
        productRows.deleteAllInBatch();
        categoryRows.deleteAllInBatch();
        categoryRows.flush();
    }

    private void loadCategories() {
        List<SeedCategory> categories = seedFiles.categories();
        for (int position = 0; position < categories.size(); position++) {
            SeedCategory category = categories.get(position);
            categoryRows.save(new CategoryRow(category.id(), category.name(), category.slug(), position));
        }
    }

    private int loadProducts() {
        List<SeedProduct> products = seedFiles.products();
        for (int position = 0; position < products.size(); position++) {
            SeedProduct product = products.get(position);
            productRows.save(new ProductRow(product.id(), product.name(), product.slug(), product.description(),
                    product.price().amount(), product.price().currency(), product.categorySlug(),
                    product.stock(), product.imageUrl(), position));
        }
        return products.size();
    }

    private void loadPromotionCodes() {
        for (SeedPromotion promotion : seedFiles.promotionCodes()) {
            promotionRows.save(new PromotionRow(promotion.code(), promotion.kind(), promotion.percentage(),
                    promotion.amount() == null ? null : promotion.amount().amount(),
                    promotion.minimumSubtotal() == null ? null : promotion.minimumSubtotal().amount(),
                    Instant.parse(promotion.validFrom()), Instant.parse(promotion.validUntil()),
                    promotion.usageLimit(), promotion.timesUsed()));
        }
    }

    private void loadCustomers() {
        for (SeedCustomer customer : seedFiles.customers()) {
            customerRows.save(new CustomerRow(customer.id(), customer.email(), customer.name(),
                    passwordHasher.hash(customer.password()), Instant.parse(customer.createdAt())));
            List<String> wished = customer.wishlist();
            for (int position = 0; position < wished.size(); position++) {
                wishlistEntryRows.save(new WishlistEntryRow(customer.id() + ":" + wished.get(position),
                        customer.id(), wished.get(position), position));
            }
        }
    }
}
