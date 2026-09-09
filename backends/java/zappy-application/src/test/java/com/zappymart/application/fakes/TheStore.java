package com.zappymart.application.fakes;

import com.zappymart.application.ports.AccessToken;
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
import com.zappymart.application.ports.SignedInVisitor;
import com.zappymart.application.ports.TokenIssuer;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.application.ports.WishlistRepository;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.accounts.RefreshToken;
import com.zappymart.domain.accounts.Session;
import com.zappymart.domain.accounts.Wishlist;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.cart.CartLine;
import com.zappymart.domain.catalogue.Category;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.ordering.Order;
import com.zappymart.domain.promotions.Promotion;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.shared.DomainEvent;
import com.zappymart.domain.shared.EmailAddress;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

public final class TheStore {

    public static final Instant NOW = Instant.parse("2026-09-09T12:00:00Z");

    public final Map<String, Product> products = new LinkedHashMap<>();
    public final List<Category> categories = new ArrayList<>();
    public final Map<String, Cart> carts = new LinkedHashMap<>();
    public final Map<String, Promotion> promotions = new LinkedHashMap<>();
    public final Map<String, Order> orders = new LinkedHashMap<>();
    public final Map<String, Customer> customers = new LinkedHashMap<>();
    public final Map<String, Wishlist> wishlists = new LinkedHashMap<>();
    public final Map<String, Session> sessions = new LinkedHashMap<>();
    public final Map<String, RefreshToken> refreshTokens = new LinkedHashMap<>();
    public final List<Mailer.MailMessage> sentMail = new ArrayList<>();
    public final List<DomainEvent> publishedEvents = new ArrayList<>();

    public Instant moment = NOW;
    public boolean rateLimiterAllows = true;
    public int nextIdentifier = 1;

    public final Clock clock = () -> moment;

    public final IdentifierGenerator identifierGenerator = () -> "generated-" + nextIdentifier++;

    public final UnitOfWork unitOfWork = new UnitOfWork() {
        @Override
        public <TValue> TValue inTransaction(Supplier<TValue> work) {
            return work.get();
        }
    };

    public final PasswordHasher passwordHasher = new PasswordHasher() {
        @Override
        public String hash(String password) {
            return "hashed:" + password;
        }

        @Override
        public boolean matches(String password, String storedHash) {
            return storedHash.equals("hashed:" + password);
        }
    };

    public final RateLimiter rateLimiter = new RateLimiter() {
        @Override
        public boolean allows(String key) {
            return rateLimiterAllows;
        }

        @Override
        public void forgetEverything() {
            rateLimiterAllows = true;
        }
    };

    public final Mailer mailer = sentMail::add;

    public final DomainEventPublisher domainEventPublisher = publishedEvents::add;

    public final TokenIssuer tokenIssuer = new TokenIssuer() {
        @Override
        public AccessToken issueAccessToken(String customerId, String sessionId) {
            return new AccessToken("access:" + customerId + ":" + sessionId, moment.plusSeconds(900));
        }

        @Override
        public Optional<SignedInVisitor> readAccessToken(String token) {
            if (token == null || !token.startsWith("access:")) {
                return Optional.empty();
            }
            String[] parts = token.split(":");
            return Optional.of(new SignedInVisitor(parts[1], parts[2]));
        }

        @Override
        public String newRefreshToken() {
            return "refresh-" + nextIdentifier++;
        }

        @Override
        public String hashOfRefreshToken(String refreshToken) {
            return "hashed:" + refreshToken;
        }
    };

    public final ProductRepository productRepository = new ProductRepository() {
        @Override
        public List<Product> catalogue() {
            return List.copyOf(products.values());
        }

        @Override
        public Optional<Product> byId(String productId) {
            return Optional.ofNullable(products.get(productId));
        }

        @Override
        public Optional<Product> bySlug(String slug) {
            return products.values().stream().filter(product -> product.slug().equals(slug)).findFirst();
        }

        @Override
        public List<Product> byIds(Collection<String> productIds) {
            return products.values().stream().filter(product -> productIds.contains(product.id())).toList();
        }

        @Override
        public void reduceStock(String productId, int quantity) {
            Product product = products.get(productId);
            products.put(productId, product.withStock(product.stock() - quantity));
        }
    };

    public final CategoryRepository categoryRepository = () -> List.copyOf(categories);

    public final CartRepository cartRepository = new CartRepository() {
        @Override
        public Optional<Cart> byId(String cartId) {
            return Optional.ofNullable(carts.get(cartId)).map(TheStore.this::withTodaysProducts);
        }

        @Override
        public Optional<Cart> ofCustomer(String customerId) {
            return carts.values().stream()
                    .filter(cart -> customerId.equals(cart.customerId()))
                    .findFirst()
                    .map(TheStore.this::withTodaysProducts);
        }

        @Override
        public Cart save(Cart cart) {
            carts.put(cart.id(), cart);
            return cart;
        }

        @Override
        public void delete(String cartId) {
            carts.remove(cartId);
        }
    };

    public final PromotionRepository promotionRepository = new PromotionRepository() {
        @Override
        public Optional<Promotion> byCode(PromotionCode code) {
            return Optional.ofNullable(promotions.get(code.value()));
        }

        @Override
        public void save(Promotion promotion) {
            promotions.put(promotion.code().value(), promotion);
        }
    };

    public final OrderRepository orderRepository = new OrderRepository() {
        @Override
        public Order save(Order order) {
            orders.put(order.id(), order);
            return order;
        }

        @Override
        public List<Order> ofCustomerNewestFirst(String customerId) {
            return orders.values().stream()
                    .filter(order -> order.customerId().equals(customerId))
                    .sorted((left, right) -> right.placedAt().compareTo(left.placedAt()))
                    .toList();
        }

        @Override
        public Optional<Order> byIdOfCustomer(String orderId, String customerId) {
            return Optional.ofNullable(orders.get(orderId))
                    .filter(order -> order.customerId().equals(customerId));
        }

        @Override
        public String nextOrderNumber() {
            return String.format("ZM-%06d", orders.size() + 1);
        }
    };

    public final CustomerRepository customerRepository = new CustomerRepository() {
        @Override
        public Optional<Customer> byId(String customerId) {
            return Optional.ofNullable(customers.get(customerId));
        }

        @Override
        public Optional<Customer> byEmail(EmailAddress email) {
            return customers.values().stream().filter(customer -> customer.email().equals(email)).findFirst();
        }

        @Override
        public Customer save(Customer customer) {
            customers.put(customer.id(), customer);
            return customer;
        }
    };

    public final WishlistRepository wishlistRepository = new WishlistRepository() {
        @Override
        public Wishlist ofOwner(String ownerId) {
            return wishlists.getOrDefault(ownerId, Wishlist.emptyFor(ownerId));
        }

        @Override
        public Wishlist save(Wishlist wishlist) {
            wishlists.put(wishlist.ownerId(), wishlist);
            return wishlist;
        }

        @Override
        public void delete(String ownerId) {
            wishlists.remove(ownerId);
        }
    };

    public final SessionStore sessionStore = new SessionStore() {
        @Override
        public Session save(Session session) {
            sessions.put(session.id(), session);
            return session;
        }

        @Override
        public Optional<Session> sessionById(String sessionId) {
            return Optional.ofNullable(sessions.get(sessionId));
        }

        @Override
        public List<Session> openSessionsOf(String customerId, Instant at) {
            return sessions.values().stream()
                    .filter(session -> session.customerId().equals(customerId))
                    .filter(session -> session.isOpenAt(at))
                    .sorted((left, right) -> right.createdAt().compareTo(left.createdAt()))
                    .toList();
        }

        @Override
        public RefreshToken save(RefreshToken refreshToken) {
            refreshTokens.put(refreshToken.id(), refreshToken);
            return refreshToken;
        }

        @Override
        public Optional<RefreshToken> refreshTokenByHash(String tokenHash) {
            return refreshTokens.values().stream()
                    .filter(token -> token.tokenHash().equals(tokenHash))
                    .findFirst();
        }

        @Override
        public void revokeFamily(String sessionId, Instant at) {
            sessionById(sessionId).ifPresent(session -> sessions.put(sessionId, session.revokedAt(at)));
            refreshTokens.replaceAll((id, token) ->
                    token.sessionId().equals(sessionId) && !token.wasAlreadyUsed() ? token.rotatedAt(at) : token);
        }
    };

    private Cart withTodaysProducts(Cart cart) {
        List<CartLine> lines = cart.lines().stream()
                .map(line -> line.withProduct(products.get(line.product().id())))
                .toList();
        return Cart.of(cart.id(), cart.customerId(), lines, cart.promotionCode(), cart.promotionRule(),
                cart.updatedAt());
    }

    public TheStore holding(Product... catalogue) {
        for (Product product : catalogue) {
            products.put(product.id(), product);
            if (categories.stream().noneMatch(category -> category.slug().equals(product.category().slug()))) {
                categories.add(product.category());
            }
        }
        return this;
    }

    public TheStore offering(Promotion... codes) {
        for (Promotion promotion : codes) {
            promotions.put(promotion.code().value(), promotion);
        }
        return this;
    }

    public TheStore knowing(Customer... registered) {
        for (Customer customer : registered) {
            customers.put(customer.id(), customer);
        }
        return this;
    }
}
