package nl.zappymart.host

import nl.zappymart.application.accounts.AddToWishlist
import nl.zappymart.application.accounts.FindSignedInCustomer
import nl.zappymart.application.accounts.IdentifyVisitor
import nl.zappymart.application.accounts.ListSessions
import nl.zappymart.application.accounts.LogInCustomer
import nl.zappymart.application.accounts.LogOut
import nl.zappymart.application.accounts.RefreshSession
import nl.zappymart.application.accounts.RegisterCustomer
import nl.zappymart.application.accounts.RemoveFromWishlist
import nl.zappymart.application.accounts.RevokeSession
import nl.zappymart.application.accounts.SignIn
import nl.zappymart.application.accounts.ViewWishlist
import nl.zappymart.application.accounts.WishlistOwner
import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.ApplyPromotionCode
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.ChangeCartLineQuantity
import nl.zappymart.application.cart.RemoveCartLine
import nl.zappymart.application.cart.RemovePromotionCode
import nl.zappymart.application.cart.ViewCart
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.catalogue.FindProduct
import nl.zappymart.application.catalogue.ListCategories
import nl.zappymart.application.catalogue.ListProducts
import nl.zappymart.application.ordering.FindOrder
import nl.zappymart.application.ordering.ListOrders
import nl.zappymart.application.ordering.PlaceOrder
import nl.zappymart.application.ordering.SendOrderConfirmation
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.CategoryRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderNumberFactory
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.application.promotions.CountPromotionUse
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class UseCaseConfiguration {

    @Bean
    fun listProducts(products: ProductRepository) = ListProducts(products)

    @Bean
    fun findProduct(products: ProductRepository) = FindProduct(products)

    @Bean
    fun listCategories(categories: CategoryRepository) = ListCategories(categories)

    @Bean
    fun cartPromotion(promotions: PromotionRepository, clock: Clock) = CartPromotion(promotions, clock)

    @Bean
    fun visitorCart(carts: CartRepository, clock: Clock, identifiers: IdentifierFactory) =
        VisitorCart(carts, clock, identifiers)

    @Bean
    fun viewCart(visitorCart: VisitorCart, cartPromotion: CartPromotion) = ViewCart(visitorCart, cartPromotion)

    @Bean
    fun addToCart(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        products: ProductRepository,
        identifiers: IdentifierFactory,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    @Bean
    fun changeCartLineQuantity(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = ChangeCartLineQuantity(visitorCart, cartPromotion, carts, clock, unitOfWork)

    @Bean
    fun removeCartLine(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = RemoveCartLine(visitorCart, cartPromotion, carts, clock, unitOfWork)

    @Bean
    fun applyPromotionCode(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        unitOfWork: UnitOfWork,
    ) = ApplyPromotionCode(visitorCart, cartPromotion, carts, unitOfWork)

    @Bean
    fun removePromotionCode(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = RemovePromotionCode(visitorCart, cartPromotion, carts, clock, unitOfWork)

    @Bean
    @Suppress("LongParameterList")
    fun placeOrder(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        products: ProductRepository,
        orders: OrderRepository,
        identifiers: IdentifierFactory,
        orderNumbers: OrderNumberFactory,
        clock: Clock,
        unitOfWork: UnitOfWork,
        events: DomainEventPublisher,
    ) = PlaceOrder(
        visitorCart,
        cartPromotion,
        carts,
        products,
        orders,
        identifiers,
        orderNumbers,
        clock,
        unitOfWork,
        events,
    )

    @Bean
    fun listOrders(orders: OrderRepository) = ListOrders(orders)

    @Bean
    fun findOrder(orders: OrderRepository) = FindOrder(orders)

    @Bean
    fun sendOrderConfirmation(customers: CustomerRepository, orders: OrderRepository, mailer: Mailer) =
        SendOrderConfirmation(customers, orders, mailer)

    @Bean
    fun countPromotionUse(promotions: PromotionRepository) = CountPromotionUse(promotions)

    @Bean
    fun signIn(
        sessions: SessionRepository,
        accessTokens: AccessTokenIssuer,
        refreshTokens: RefreshTokenIssuer,
        identifiers: IdentifierFactory,
        clock: Clock,
    ) = SignIn(sessions, accessTokens, refreshTokens, identifiers, clock)

    @Bean
    fun wishlistOwner(wishlists: WishlistRepository, visitorCart: VisitorCart, carts: CartRepository) =
        WishlistOwner(wishlists, visitorCart, carts)

    @Bean
    fun registerCustomer(
        customers: CustomerRepository,
        passwords: PasswordHasher,
        identifiers: IdentifierFactory,
        clock: Clock,
        signIn: SignIn,
        visitorCart: VisitorCart,
        wishlistOwner: WishlistOwner,
        rateLimiter: RateLimiter,
        unitOfWork: UnitOfWork,
    ) = RegisterCustomer(customers, passwords, identifiers, clock, signIn, visitorCart, wishlistOwner, rateLimiter, unitOfWork)

    @Bean
    fun logInCustomer(
        customers: CustomerRepository,
        passwords: PasswordHasher,
        signIn: SignIn,
        visitorCart: VisitorCart,
        wishlistOwner: WishlistOwner,
        rateLimiter: RateLimiter,
        unitOfWork: UnitOfWork,
    ) = LogInCustomer(customers, passwords, signIn, visitorCart, wishlistOwner, rateLimiter, unitOfWork)

    @Bean
    fun refreshSession(
        sessions: SessionRepository,
        customers: CustomerRepository,
        accessTokens: AccessTokenIssuer,
        refreshTokens: RefreshTokenIssuer,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = RefreshSession(sessions, customers, accessTokens, refreshTokens, clock, unitOfWork)

    @Bean
    fun logOut(
        sessions: SessionRepository,
        refreshTokens: RefreshTokenIssuer,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = LogOut(sessions, refreshTokens, clock, unitOfWork)

    @Bean
    fun revokeSession(sessions: SessionRepository, clock: Clock, unitOfWork: UnitOfWork) =
        RevokeSession(sessions, clock, unitOfWork)

    @Bean
    fun findSignedInCustomer(customers: CustomerRepository) = FindSignedInCustomer(customers)

    @Bean
    fun listSessions(sessions: SessionRepository, clock: Clock) = ListSessions(sessions, clock)

    @Bean
    fun identifyVisitor(accessTokens: AccessTokenIssuer, sessions: SessionRepository, clock: Clock) =
        IdentifyVisitor(accessTokens, sessions, clock)

    @Bean
    fun viewWishlist(
        wishlists: WishlistRepository,
        products: ProductRepository,
        wishlistOwner: WishlistOwner,
    ) = ViewWishlist(wishlists, products, wishlistOwner)

    @Bean
    fun addToWishlist(
        wishlists: WishlistRepository,
        products: ProductRepository,
        viewWishlist: ViewWishlist,
        wishlistOwner: WishlistOwner,
        unitOfWork: UnitOfWork,
    ) = AddToWishlist(wishlists, products, viewWishlist, wishlistOwner, unitOfWork)

    @Bean
    fun removeFromWishlist(
        wishlists: WishlistRepository,
        viewWishlist: ViewWishlist,
        wishlistOwner: WishlistOwner,
        unitOfWork: UnitOfWork,
    ) = RemoveFromWishlist(wishlists, viewWishlist, wishlistOwner, unitOfWork)
}
