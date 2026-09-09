using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class Store
{
    public static readonly DateTimeOffset Moment = new(2026, 9, 9, 12, 0, 0, TimeSpan.Zero);

    public Store(params Product[] catalogue)
    {
        Products = new InMemoryProducts(catalogue);
        PromotionCodes = new InMemoryPromotionCodes(
            new PromotionCode("WELCOME10", PromotionKind.Percentage, 10, null, null, Moment.AddYears(-1), Moment.AddYears(1), null, 0),
            new PromotionCode("SUMMER2025", PromotionKind.Percentage, 10, null, null, Moment.AddYears(-2), Moment.AddYears(-1), null, 0));

        var visitorCart = new VisitorCart(Carts, Clock);
        var wishlistProducts = new WishlistProducts(Products);
        var readWishlist = new ReadWishlist(Wishlist, wishlistProducts);
        var startSession = new StartSession(Sessions, TokenIssuer, Clock);
        var mergeAnonymousCart = new MergeAnonymousCart(Carts, Clock);
        var mergeAnonymousWishlist = new MergeAnonymousWishlist(Wishlist);
        var wishlistOwner = new WishlistOwner(visitorCart);

        ReadCart = new ReadCart(visitorCart);
        AddToCart = new AddToCart(visitorCart, Products, UnitOfWork, Clock);
        ChangeCartLineQuantity = new ChangeCartLineQuantity(visitorCart, UnitOfWork, Clock);
        RemoveCartLine = new RemoveCartLine(visitorCart, UnitOfWork, Clock);
        ApplyPromotionCode = new ApplyPromotionCode(visitorCart, PromotionCodes, UnitOfWork, Clock);
        RemovePromotionCode = new RemovePromotionCode(visitorCart, UnitOfWork, Clock);
        ListProducts = new ListProducts(Products);
        RegisterCustomer = new RegisterCustomer(
            Customers, PasswordHasher, RateLimiter, startSession, mergeAnonymousCart, mergeAnonymousWishlist, UnitOfWork, Clock);
        LogIn = new LogIn(
            Customers, PasswordHasher, RateLimiter, startSession, mergeAnonymousCart, mergeAnonymousWishlist, UnitOfWork, Clock);
        RefreshSession = new RefreshSession(Sessions, Customers, TokenIssuer, UnitOfWork, Clock);
        LogOut = new LogOut(Sessions, TokenIssuer, UnitOfWork, Clock);
        RevokeSession = new RevokeSession(Sessions, UnitOfWork, Clock);
        ListSessions = new ListSessions(Sessions, Clock);
        AddToWishlist = new AddToWishlist(Wishlist, Products, wishlistOwner, wishlistProducts, UnitOfWork, Clock);
        RemoveFromWishlist = new RemoveFromWishlist(Wishlist, wishlistOwner, wishlistProducts, UnitOfWork);
        ReadWishlist = readWishlist;
        WishlistOwner = wishlistOwner;
        PlaceOrder = new PlaceOrder(visitorCart, Orders, Dispatcher, UnitOfWork, Clock);
        SendOrderConfirmation = new SendOrderConfirmation(Orders, Customers, Mailer);
        RecordPromotionUse = new RecordPromotionUse(PromotionCodes, UnitOfWork);
    }

    public FixedClock Clock { get; } = new(Moment);

    public InMemoryProducts Products { get; }

    public InMemoryPromotionCodes PromotionCodes { get; }

    public InMemoryCarts Carts { get; } = new();

    public InMemoryOrders Orders { get; } = new();

    public InMemoryCustomers Customers { get; } = new();

    public InMemorySessions Sessions { get; } = new();

    public InMemoryWishlist Wishlist { get; } = new();

    public CountingPasswordHasher PasswordHasher { get; } = new();

    public CountingTokenIssuer TokenIssuer { get; } = new();

    public CountingRateLimiter RateLimiter { get; } = new(5);

    public RecordingDispatcher Dispatcher { get; } = new();

    public RecordingMailer Mailer { get; } = new();

    public DirectUnitOfWork UnitOfWork { get; } = new();

    public ReadCart ReadCart { get; }

    public AddToCart AddToCart { get; }

    public ChangeCartLineQuantity ChangeCartLineQuantity { get; }

    public RemoveCartLine RemoveCartLine { get; }

    public ApplyPromotionCode ApplyPromotionCode { get; }

    public RemovePromotionCode RemovePromotionCode { get; }

    public ListProducts ListProducts { get; }

    public RegisterCustomer RegisterCustomer { get; }

    public LogIn LogIn { get; }

    public RefreshSession RefreshSession { get; }

    public LogOut LogOut { get; }

    public RevokeSession RevokeSession { get; }

    public ListSessions ListSessions { get; }

    public AddToWishlist AddToWishlist { get; }

    public RemoveFromWishlist RemoveFromWishlist { get; }

    public ReadWishlist ReadWishlist { get; }

    public WishlistOwner WishlistOwner { get; }

    public PlaceOrder PlaceOrder { get; }

    public SendOrderConfirmation SendOrderConfirmation { get; }

    public RecordPromotionUse RecordPromotionUse { get; }

    public static Product AProduct(string id = "product-18", int price = 985, int stock = 25) =>
        new(id, $"Product {id}", $"product-{id}", "A description.", Money.Euro(price), "electronics", stock, null, 1);
}
