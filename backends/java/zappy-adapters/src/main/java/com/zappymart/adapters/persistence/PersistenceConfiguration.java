package com.zappymart.adapters.persistence;

import com.zappymart.adapters.seed.SeedFiles;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.CategoryRepository;
import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.application.ports.OrderRepository;
import com.zappymart.application.ports.PasswordHasher;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.application.ports.PromotionRepository;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.application.ports.StoreSeeder;
import com.zappymart.application.ports.WishlistRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PersistenceConfiguration {

    @Bean
    public CategoryRepository categoryRepository(CategoryRowRepository categoryRows) {
        return new JpaCategoryRepository(categoryRows);
    }

    @Bean
    public CachedProductRepository productRepository(ProductRowRepository productRows,
                                                     CategoryRowRepository categoryRows) {
        return new CachedProductRepository(new JpaProductRepository(productRows, categoryRows));
    }

    @Bean
    public PromotionRepository promotionRepository(PromotionRowRepository promotionRows) {
        return new JpaPromotionRepository(promotionRows);
    }

    @Bean
    public CartRepository cartRepository(CartRowRepository cartRows, CartLineRowRepository cartLineRows,
                                         ProductRepository productRepository,
                                         PromotionRepository promotionRepository) {
        return new JpaCartRepository(cartRows, cartLineRows, productRepository, promotionRepository);
    }

    @Bean
    public OrderRepository orderRepository(OrderRowRepository orderRows, OrderLineRowRepository orderLineRows) {
        return new JpaOrderRepository(orderRows, orderLineRows);
    }

    @Bean
    public CustomerRepository customerRepository(CustomerRowRepository customerRows) {
        return new JpaCustomerRepository(customerRows);
    }

    @Bean
    public WishlistRepository wishlistRepository(WishlistEntryRowRepository wishlistEntryRows) {
        return new JpaWishlistRepository(wishlistEntryRows);
    }

    @Bean
    public SessionStore sessionStore(SessionRowRepository sessionRows,
                                     RefreshTokenRowRepository refreshTokenRows) {
        return new JpaSessionStore(sessionRows, refreshTokenRows);
    }

    @Bean
    public SeedFiles seedFiles() {
        return new SeedFiles();
    }

    @Bean
    public StoreSeeder storeSeeder(SeedFiles seedFiles, PasswordHasher passwordHasher,
                                   CachedProductRepository cachedProductRepository,
                                   CategoryRowRepository categoryRows, ProductRowRepository productRows,
                                   PromotionRowRepository promotionRows, CustomerRowRepository customerRows,
                                   WishlistEntryRowRepository wishlistEntryRows, CartRowRepository cartRows,
                                   CartLineRowRepository cartLineRows, OrderRowRepository orderRows,
                                   OrderLineRowRepository orderLineRows, SessionRowRepository sessionRows,
                                   RefreshTokenRowRepository refreshTokenRows) {
        return new JpaStoreSeeder(seedFiles, passwordHasher, cachedProductRepository, categoryRows, productRows,
                promotionRows, customerRows, wishlistEntryRows, cartRows, cartLineRows, orderRows,
                orderLineRows, sessionRows, refreshTokenRows);
    }
}
