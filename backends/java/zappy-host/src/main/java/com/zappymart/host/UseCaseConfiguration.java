package com.zappymart.host;

import com.zappymart.application.accounts.AddToWishlist;
import com.zappymart.application.accounts.AnonymousHandover;
import com.zappymart.application.accounts.FindSignedInCustomer;
import com.zappymart.application.accounts.IdentifyVisitor;
import com.zappymart.application.accounts.ListOpenSessions;
import com.zappymart.application.accounts.LogInCustomer;
import com.zappymart.application.accounts.LogOut;
import com.zappymart.application.accounts.RefreshSession;
import com.zappymart.application.accounts.RegisterCustomer;
import com.zappymart.application.accounts.RemoveFromWishlist;
import com.zappymart.application.accounts.RevokeSession;
import com.zappymart.application.accounts.SessionOpening;
import com.zappymart.application.accounts.ViewWishlist;
import com.zappymart.application.cart.AddToCart;
import com.zappymart.application.cart.ChangeCartLineQuantity;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.cart.RemoveCartLine;
import com.zappymart.application.cart.ViewCart;
import com.zappymart.application.catalogue.FindProductById;
import com.zappymart.application.catalogue.FindProductBySlug;
import com.zappymart.application.catalogue.ListCategories;
import com.zappymart.application.catalogue.ListProducts;
import com.zappymart.application.development.ResetSeed;
import com.zappymart.application.ordering.FindOrder;
import com.zappymart.application.ordering.ListOrders;
import com.zappymart.application.ordering.PlaceOrder;
import com.zappymart.application.ordering.SendOrderConfirmation;
import com.zappymart.application.ports.CartRepository;
import com.zappymart.application.ports.CategoryRepository;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.application.ports.DomainEventPublisher;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.Mailer;
import com.zappymart.application.ports.OrderRepository;
import com.zappymart.application.ports.PasswordHasher;
import com.zappymart.application.ports.ProductRepository;
import com.zappymart.application.ports.PromotionRepository;
import com.zappymart.application.ports.RateLimiter;
import com.zappymart.application.ports.SessionStore;
import com.zappymart.application.ports.StoreSeeder;
import com.zappymart.application.ports.TokenIssuer;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.application.ports.WishlistRepository;
import com.zappymart.application.promotions.ApplyPromotionCode;
import com.zappymart.application.promotions.CountPromotionUse;
import com.zappymart.application.promotions.RemovePromotionCode;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UseCaseConfiguration {

    @Bean
    public ListProducts listProducts(ProductRepository productRepository) {
        return new ListProducts(productRepository);
    }

    @Bean
    public FindProductBySlug findProductBySlug(ProductRepository productRepository) {
        return new FindProductBySlug(productRepository);
    }

    @Bean
    public FindProductById findProductById(ProductRepository productRepository) {
        return new FindProductById(productRepository);
    }

    @Bean
    public ListCategories listCategories(CategoryRepository categoryRepository) {
        return new ListCategories(categoryRepository);
    }

    @Bean
    public CurrentCart currentCart(CartRepository cartRepository, IdentifierGenerator identifierGenerator,
                                   Clock clock) {
        return new CurrentCart(cartRepository, identifierGenerator, clock);
    }

    @Bean
    public ViewCart viewCart(CurrentCart currentCart) {
        return new ViewCart(currentCart);
    }

    @Bean
    public AddToCart addToCart(UnitOfWork unitOfWork, CurrentCart currentCart, CartRepository cartRepository,
                               ProductRepository productRepository, IdentifierGenerator identifierGenerator,
                               Clock clock) {
        return new AddToCart(unitOfWork, currentCart, cartRepository, productRepository, identifierGenerator, clock);
    }

    @Bean
    public ChangeCartLineQuantity changeCartLineQuantity(UnitOfWork unitOfWork, CurrentCart currentCart,
                                                         CartRepository cartRepository, Clock clock) {
        return new ChangeCartLineQuantity(unitOfWork, currentCart, cartRepository, clock);
    }

    @Bean
    public RemoveCartLine removeCartLine(UnitOfWork unitOfWork, CurrentCart currentCart,
                                         CartRepository cartRepository, Clock clock) {
        return new RemoveCartLine(unitOfWork, currentCart, cartRepository, clock);
    }

    @Bean
    public ApplyPromotionCode applyPromotionCode(UnitOfWork unitOfWork, CurrentCart currentCart,
                                                 CartRepository cartRepository,
                                                 PromotionRepository promotionRepository, Clock clock) {
        return new ApplyPromotionCode(unitOfWork, currentCart, cartRepository, promotionRepository, clock);
    }

    @Bean
    public RemovePromotionCode removePromotionCode(UnitOfWork unitOfWork, CurrentCart currentCart,
                                                   CartRepository cartRepository, Clock clock) {
        return new RemovePromotionCode(unitOfWork, currentCart, cartRepository, clock);
    }

    @Bean
    public SessionOpening sessionOpening(SessionStore sessionStore, TokenIssuer tokenIssuer,
                                         IdentifierGenerator identifierGenerator, Clock clock) {
        return new SessionOpening(sessionStore, tokenIssuer, identifierGenerator, clock);
    }

    @Bean
    public AnonymousHandover anonymousHandover(CurrentCart currentCart, CartRepository cartRepository,
                                               WishlistRepository wishlistRepository,
                                               IdentifierGenerator identifierGenerator, Clock clock) {
        return new AnonymousHandover(currentCart, cartRepository, wishlistRepository, identifierGenerator, clock);
    }

    @Bean
    public IdentifyVisitor identifyVisitor(TokenIssuer tokenIssuer, SessionStore sessionStore,
                                           IdentifierGenerator identifierGenerator, Clock clock) {
        return new IdentifyVisitor(tokenIssuer, sessionStore, identifierGenerator, clock);
    }

    @Bean
    public RegisterCustomer registerCustomer(UnitOfWork unitOfWork, CustomerRepository customerRepository,
                                             PasswordHasher passwordHasher, SessionOpening sessionOpening,
                                             AnonymousHandover anonymousHandover, RateLimiter rateLimiter,
                                             IdentifierGenerator identifierGenerator, Clock clock) {
        return new RegisterCustomer(unitOfWork, customerRepository, passwordHasher, sessionOpening,
                anonymousHandover, rateLimiter, identifierGenerator, clock);
    }

    @Bean
    public LogInCustomer logInCustomer(UnitOfWork unitOfWork, CustomerRepository customerRepository,
                                       PasswordHasher passwordHasher, SessionOpening sessionOpening,
                                       AnonymousHandover anonymousHandover, RateLimiter rateLimiter) {
        return new LogInCustomer(unitOfWork, customerRepository, passwordHasher, sessionOpening,
                anonymousHandover, rateLimiter);
    }

    @Bean
    public RefreshSession refreshSession(UnitOfWork unitOfWork, SessionStore sessionStore,
                                         CustomerRepository customerRepository, TokenIssuer tokenIssuer,
                                         SessionOpening sessionOpening, Clock clock) {
        return new RefreshSession(unitOfWork, sessionStore, customerRepository, tokenIssuer, sessionOpening, clock);
    }

    @Bean
    public LogOut logOut(UnitOfWork unitOfWork, SessionStore sessionStore, TokenIssuer tokenIssuer, Clock clock) {
        return new LogOut(unitOfWork, sessionStore, tokenIssuer, clock);
    }

    @Bean
    public RevokeSession revokeSession(UnitOfWork unitOfWork, SessionStore sessionStore, Clock clock) {
        return new RevokeSession(unitOfWork, sessionStore, clock);
    }

    @Bean
    public FindSignedInCustomer findSignedInCustomer(CustomerRepository customerRepository) {
        return new FindSignedInCustomer(customerRepository);
    }

    @Bean
    public ListOpenSessions listOpenSessions(SessionStore sessionStore, Clock clock) {
        return new ListOpenSessions(sessionStore, clock);
    }

    @Bean
    public ViewWishlist viewWishlist(WishlistRepository wishlistRepository, ProductRepository productRepository) {
        return new ViewWishlist(wishlistRepository, productRepository);
    }

    @Bean
    public AddToWishlist addToWishlist(UnitOfWork unitOfWork, WishlistRepository wishlistRepository,
                                       ProductRepository productRepository, ViewWishlist viewWishlist) {
        return new AddToWishlist(unitOfWork, wishlistRepository, productRepository, viewWishlist);
    }

    @Bean
    public RemoveFromWishlist removeFromWishlist(UnitOfWork unitOfWork, WishlistRepository wishlistRepository,
                                                 ViewWishlist viewWishlist) {
        return new RemoveFromWishlist(unitOfWork, wishlistRepository, viewWishlist);
    }

    @Bean
    public PlaceOrder placeOrder(UnitOfWork unitOfWork, CurrentCart currentCart, CartRepository cartRepository,
                                 OrderRepository orderRepository, ProductRepository productRepository,
                                 DomainEventPublisher domainEventPublisher,
                                 IdentifierGenerator identifierGenerator, Clock clock) {
        return new PlaceOrder(unitOfWork, currentCart, cartRepository, orderRepository, productRepository,
                domainEventPublisher, identifierGenerator, clock);
    }

    @Bean
    public ListOrders listOrders(OrderRepository orderRepository) {
        return new ListOrders(orderRepository);
    }

    @Bean
    public FindOrder findOrder(OrderRepository orderRepository) {
        return new FindOrder(orderRepository);
    }

    @Bean
    public SendOrderConfirmation sendOrderConfirmation(OrderRepository orderRepository,
                                                       CustomerRepository customerRepository, Mailer mailer) {
        return new SendOrderConfirmation(orderRepository, customerRepository, mailer);
    }

    @Bean
    public CountPromotionUse countPromotionUse(UnitOfWork unitOfWork, PromotionRepository promotionRepository) {
        return new CountPromotionUse(unitOfWork, promotionRepository);
    }

    @Bean
    public ResetSeed resetSeed(UnitOfWork unitOfWork, StoreSeeder storeSeeder, RateLimiter rateLimiter) {
        return new ResetSeed(unitOfWork, storeSeeder, rateLimiter);
    }
}
