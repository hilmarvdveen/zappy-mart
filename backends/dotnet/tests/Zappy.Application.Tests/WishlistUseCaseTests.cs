using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class WishlistUseCaseTests
{
    private readonly Store store = new(Store.AProduct(), Store.AProduct("product-05", 69500, 3));

    [Fact]
    public async Task AnAnonymousVisitorKeepsAWishlistAgainstTheCartCookie()
    {
        var result = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Equal("product-18", result.Products.Single().Id);
        Assert.Equal(store.Carts.Carts.Single().Id, result.AnonymousCartId);
    }

    [Fact]
    public async Task TheAnswerCarriesTheWishlistAfterTheChange()
    {
        var first = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);
        var visitor = new Visitor(null, null, first.AnonymousCartId);

        var second = await store.AddToWishlist.Execute(visitor, "product-05", CancellationToken.None);
        var third = await store.RemoveFromWishlist.Execute(visitor, "product-18", CancellationToken.None);

        Assert.Equal(2, second.Products.Count);
        Assert.Equal("product-05", third.Products.Single().Id);
    }

    [Fact]
    public async Task AddingTheSameProductTwiceChangesNothing()
    {
        var first = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);
        var visitor = new Visitor(null, null, first.AnonymousCartId);

        var second = await store.AddToWishlist.Execute(visitor, "product-18", CancellationToken.None);

        Assert.Single(second.Products);
        Assert.Empty(second.Errors);
    }

    [Fact]
    public async Task AnUnknownProductIsNotFound()
    {
        var result = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-99", CancellationToken.None);

        Assert.Equal(UserErrorCode.ProductNotFound, result.Errors.Single().Code);
    }

    [Fact]
    public async Task RemovingAProductThatIsNotOnTheListIsNotAnError()
    {
        var result = await store.RemoveFromWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Empty(result.Products);
    }

    [Fact]
    public async Task ASignedInCustomerKeepsTheWishlistAgainstTheCustomer()
    {
        var visitor = new Visitor("customer-01", "session-01", null);

        var result = await store.AddToWishlist.Execute(visitor, "product-18", CancellationToken.None);

        Assert.Null(result.AnonymousCartId);
        Assert.Equal("customer-01", store.Wishlist.Entries.Single().OwnerId);
    }

    [Fact]
    public async Task TheWishlistIsNewestFirst()
    {
        var first = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);
        var visitor = new Visitor(null, null, first.AnonymousCartId);
        store.Clock.Now = Store.Moment.AddMinutes(1);

        var second = await store.AddToWishlist.Execute(visitor, "product-05", CancellationToken.None);

        Assert.Equal("product-05", second.Products[0].Id);
    }
}
