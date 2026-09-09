package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.cart.AddToCart;
import com.zappymart.application.cart.CurrentCart;
import com.zappymart.application.fakes.TheStore;
import com.zappymart.domain.accounts.Session;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserError;
import com.zappymart.domain.shared.UserErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.zappymart.application.fakes.SeedLikeData.JANE;
import static com.zappymart.application.fakes.SeedLikeData.SHIRT;
import static com.zappymart.application.fakes.SeedLikeData.SOLD_OUT_RING;
import static org.assertj.core.api.Assertions.assertThat;

class AccountUseCasesTest {

    private static final String THE_PASSWORD = "correct horse battery staple";

    private final TheStore store = new TheStore().holding(SHIRT, SOLD_OUT_RING).knowing(JANE);

    private final Visitor anonymous = new Visitor("cart-cookie", null, null, "curl", "http://localhost:5173");

    private CurrentCart currentCart;
    private SessionOpening sessionOpening;
    private AnonymousHandover anonymousHandover;
    private RegisterCustomer registerCustomer;
    private LogInCustomer logInCustomer;
    private RefreshSession refreshSession;
    private LogOut logOut;
    private RevokeSession revokeSession;
    private IdentifyVisitor identifyVisitor;
    private ViewWishlist viewWishlist;
    private AddToWishlist addToWishlist;
    private RemoveFromWishlist removeFromWishlist;

    @BeforeEach
    void wireTheUseCases() {
        currentCart = new CurrentCart(store.cartRepository, store.identifierGenerator, store.clock);
        sessionOpening = new SessionOpening(store.sessionStore, store.tokenIssuer, store.identifierGenerator,
                store.clock);
        anonymousHandover = new AnonymousHandover(currentCart, store.cartRepository, store.wishlistRepository,
                store.identifierGenerator, store.clock);
        registerCustomer = new RegisterCustomer(store.unitOfWork, store.customerRepository, store.passwordHasher,
                sessionOpening, anonymousHandover, store.rateLimiter, store.identifierGenerator, store.clock);
        logInCustomer = new LogInCustomer(store.unitOfWork, store.customerRepository, store.passwordHasher,
                sessionOpening, anonymousHandover, store.rateLimiter);
        refreshSession = new RefreshSession(store.unitOfWork, store.sessionStore, store.customerRepository,
                store.tokenIssuer, sessionOpening, store.clock);
        logOut = new LogOut(store.unitOfWork, store.sessionStore, store.tokenIssuer, store.clock);
        revokeSession = new RevokeSession(store.unitOfWork, store.sessionStore, store.clock);
        identifyVisitor = new IdentifyVisitor(store.tokenIssuer, store.sessionStore, store.identifierGenerator,
                store.clock);
        viewWishlist = new ViewWishlist(store.wishlistRepository, store.productRepository);
        addToWishlist = new AddToWishlist(store.unitOfWork, store.wishlistRepository, store.productRepository,
                viewWishlist);
        removeFromWishlist = new RemoveFromWishlist(store.unitOfWork, store.wishlistRepository, viewWishlist);
    }

    @Test
    void registersACustomerAndSignsThemInAtOnce() {
        Authentication authentication = registerCustomer
                .execute(anonymous, "New@Example.com", "New Customer", "a long enough password")
                .valueOrThrow();

        assertThat(authentication.customer().email().value()).isEqualTo("new@example.com");
        assertThat(authentication.accessToken().value()).startsWith("access:");
        assertThat(authentication.refreshToken()).isNotBlank();
        assertThat(store.sessions).containsKey(authentication.sessionId());
    }

    @Test
    void refusesARegistrationThatBreaksARule() {
        assertThat(reasonOf(registerCustomer.execute(anonymous, "nope", "Name", "a long enough password")))
                .isEqualTo(UserErrorCode.EMAIL_INVALID);
        assertThat(reasonOf(registerCustomer.execute(anonymous, "new@example.com", "Name", "short")))
                .isEqualTo(UserErrorCode.PASSWORD_TOO_SHORT);
        assertThat(reasonOf(registerCustomer.execute(anonymous, "jane@example.com", "Name", "a long password")))
                .isEqualTo(UserErrorCode.EMAIL_TAKEN);

        store.rateLimiterAllows = false;

        assertThat(reasonOf(registerCustomer.execute(anonymous, "other@example.com", "Name", "a long password")))
                .isEqualTo(UserErrorCode.RATE_LIMITED);
    }

    @Test
    void logsInAndAnswersOneReasonWhateverIsWrong() {
        assertThat(logInCustomer.execute(anonymous, "JANE@example.com", THE_PASSWORD, "Chrome")
                .valueOrThrow().customer().id()).isEqualTo("customer-01");
        assertThat(reasonOf(logInCustomer.execute(anonymous, "jane@example.com", "wrong password here", null)))
                .isEqualTo(UserErrorCode.CREDENTIALS_INVALID);
        assertThat(reasonOf(logInCustomer.execute(anonymous, "nobody@example.com", THE_PASSWORD, null)))
                .isEqualTo(UserErrorCode.CREDENTIALS_INVALID);
        assertThat(reasonOf(logInCustomer.execute(anonymous, "not an address", THE_PASSWORD, null)))
                .isEqualTo(UserErrorCode.CREDENTIALS_INVALID);
    }

    @Test
    void handsTheAnonymousCartAndWishlistToTheCustomerOnLogin() {
        new AddToCart(store.unitOfWork, currentCart, store.cartRepository, store.productRepository,
                store.identifierGenerator, store.clock).execute(anonymous, SHIRT.id(), 2);
        addToWishlist.execute(anonymous, SHIRT.id());

        Authentication authentication = logInCustomer
                .execute(anonymous, "jane@example.com", THE_PASSWORD, "Chrome").valueOrThrow();
        Visitor signedIn = new Visitor("cart-cookie", authentication.customer().id(),
                authentication.sessionId(), "curl", "http://localhost:5173");

        assertThat(currentCart.forVisitor(signedIn).lines()).hasSize(1);
        assertThat(viewWishlist.execute(signedIn)).extracting(Product::id).containsExactly(SHIRT.id());
    }

    @Test
    void rotatesTheRefreshTokenAndRevokesTheFamilyOnAReplay() {
        Authentication first = logInCustomer.execute(anonymous, "jane@example.com", THE_PASSWORD, "Chrome")
                .valueOrThrow();

        Authentication second = refreshSession.execute(first.refreshToken()).valueOrThrow();

        assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());
        assertThat(reasonOf(refreshSession.execute(first.refreshToken())))
                .isEqualTo(UserErrorCode.SESSION_INVALID);
        assertThat(reasonOf(refreshSession.execute(second.refreshToken())))
                .isEqualTo(UserErrorCode.SESSION_INVALID);
        assertThat(reasonOf(refreshSession.execute(null))).isEqualTo(UserErrorCode.SESSION_INVALID);
        assertThat(reasonOf(refreshSession.execute("a token nobody issued")))
                .isEqualTo(UserErrorCode.SESSION_INVALID);
    }

    @Test
    void aLoggedOutSessionIsRefusedAtOnceEvenWithAValidToken() {
        Authentication authentication = logInCustomer.execute(anonymous, "jane@example.com", THE_PASSWORD, "Chrome")
                .valueOrThrow();
        Visitor signedIn = identifyVisitor.execute(authentication.accessToken().value(), "cart-cookie", "curl",
                "http://localhost:5173");

        assertThat(signedIn.isSignedIn()).isTrue();

        logOut.execute(signedIn, authentication.refreshToken());

        assertThat(identifyVisitor.execute(authentication.accessToken().value(), "cart-cookie", "curl", null)
                .isSignedIn()).isFalse();
    }

    @Test
    void logsOutThroughTheRefreshCookieWhenNoAccessTokenCame() {
        Authentication authentication = logInCustomer.execute(anonymous, "jane@example.com", THE_PASSWORD, "Chrome")
                .valueOrThrow();

        assertThat(logOut.execute(anonymous, authentication.refreshToken())).isTrue();
        assertThat(logOut.execute(anonymous, null)).isTrue();
        assertThat(store.sessions.get(authentication.sessionId()).isOpenAt(TheStore.NOW)).isFalse();
    }

    @Test
    void revokesOneSessionOfTheSignedInCustomer() {
        Authentication first = logInCustomer.execute(anonymous, "jane@example.com", THE_PASSWORD, "Chrome")
                .valueOrThrow();
        Authentication second = logInCustomer.execute(anonymous, "jane@example.com", THE_PASSWORD, "Firefox")
                .valueOrThrow();
        Visitor signedIn = new Visitor("cart-cookie", "customer-01", second.sessionId(), "curl", null);

        List<Session> stillOpen = revokeSession.execute(signedIn, first.sessionId()).valueOrThrow();

        assertThat(stillOpen).extracting(Session::id).containsExactly(second.sessionId());
        assertThat(reasonOf(revokeSession.execute(signedIn, "session-that-is-not-there")))
                .isEqualTo(UserErrorCode.SESSION_NOT_FOUND);
        assertThat(reasonOf(revokeSession.execute(anonymous, first.sessionId())))
                .isEqualTo(UserErrorCode.NOT_AUTHENTICATED);
    }

    @Test
    void anAnonymousVisitorKeepsAWishlistAgainstTheCartCookie() {
        assertThat(addToWishlist.execute(anonymous, SOLD_OUT_RING.id()).valueOrThrow())
                .extracting(Product::id).containsExactly(SOLD_OUT_RING.id());
        assertThat(addToWishlist.execute(anonymous, SHIRT.id()).valueOrThrow())
                .extracting(Product::id).containsExactly(SHIRT.id(), SOLD_OUT_RING.id());
        assertThat(removeFromWishlist.execute(anonymous, SOLD_OUT_RING.id()).valueOrThrow())
                .extracting(Product::id).containsExactly(SHIRT.id());
        assertThat(reasonOf(addToWishlist.execute(anonymous, "product-99")))
                .isEqualTo(UserErrorCode.PRODUCT_NOT_FOUND);
    }

    @Test
    void findsTheSignedInCustomerAndNobodyElse() {
        FindSignedInCustomer findSignedInCustomer = new FindSignedInCustomer(store.customerRepository);
        Visitor signedIn = new Visitor("cart-cookie", "customer-01", "session-01", "curl", null);

        assertThat(findSignedInCustomer.execute(signedIn)).contains(JANE);
        assertThat(findSignedInCustomer.execute(anonymous)).isEmpty();
    }

    @Test
    void listsTheOpenSessionsOfACustomer() {
        logInCustomer.execute(anonymous, "jane@example.com", THE_PASSWORD, "Chrome");
        ListOpenSessions listOpenSessions = new ListOpenSessions(store.sessionStore, store.clock);

        assertThat(listOpenSessions.execute("customer-01")).hasSize(1);
    }

    private static <TValue> UserErrorCode reasonOf(Result<TValue> result) {
        return result.errors().stream().map(UserError::code).findFirst().orElseThrow();
    }
}
