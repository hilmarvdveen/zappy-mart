using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class CartUseCaseTests
{
    private readonly Store store = new(Store.AProduct(), Store.AProduct("product-12", 11400, 1));

    [Fact]
    public async Task AnAnonymousVisitorGetsACartOnTheFirstAdd()
    {
        var result = await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Single(store.Carts.Carts);
        Assert.Equal(Money.Euro(1970), result.Cart.Subtotal);
    }

    [Fact]
    public async Task AnUnknownProductIsNotFound()
    {
        var result = await store.AddToCart.Execute(Visitor.Anonymous, "product-99", 1, CancellationToken.None);

        Assert.Equal(UserErrorCode.ProductNotFound, result.Errors.Single().Code);
        Assert.Equal("productId", result.Errors.Single().Field);
    }

    [Fact]
    public async Task ARefusedQuantityAnswersTheStockThatIsLeft()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-12", 1, CancellationToken.None);
        var cartId = store.Carts.Carts.Single().Id;

        var result = await store.AddToCart.Execute(
            new Visitor(null, null, cartId),
            "product-12",
            1,
            CancellationToken.None);

        Assert.Equal(UserErrorCode.OutOfStock, result.Errors.Single().Code);
        Assert.Equal(1, result.AvailableStock);
    }

    [Fact]
    public async Task AnUnknownCodeIsRefusedAndTheCartStays()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 1, CancellationToken.None);
        var visitor = new Visitor(null, null, store.Carts.Carts.Single().Id);

        var result = await store.ApplyPromotionCode.Execute(visitor, "NOPE", CancellationToken.None);

        Assert.Equal(UserErrorCode.CodeUnknown, result.Errors.Single().Code);
        Assert.Single(result.Cart.Lines);
    }

    [Fact]
    public async Task AWorkingCodeChangesTheTotals()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);
        var visitor = new Visitor(null, null, store.Carts.Carts.Single().Id);

        var result = await store.ApplyPromotionCode.Execute(visitor, "welcome10", CancellationToken.None);

        Assert.Equal(Money.Euro(197), result.Cart.Totals.Discount);
        Assert.Equal(Money.Euro(2268), result.Cart.Totals.Total);
    }

    [Fact]
    public async Task AnExpiredCodeIsRefused()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);
        var visitor = new Visitor(null, null, store.Carts.Carts.Single().Id);

        var result = await store.ApplyPromotionCode.Execute(visitor, "SUMMER2025", CancellationToken.None);

        Assert.Equal(UserErrorCode.CodeExpired, result.Errors.Single().Code);
    }

    [Fact]
    public async Task AVisitorWithoutACartReadsAnEmptyOne()
    {
        var cart = await store.ReadCart.Execute(Visitor.Anonymous, CancellationToken.None);

        Assert.True(cart.IsEmpty);
        Assert.Empty(store.Carts.Carts);
        Assert.Equal(Money.Euro(0), cart.Totals.Total);
    }

    [Fact]
    public async Task ACartCookieNeverReachesTheCartOfASignedInCustomer()
    {
        var customerCart = new Cart("cart-of-jane", "customer-01", Store.Moment);
        await store.Carts.Add(customerCart, CancellationToken.None);

        var cart = await store.ReadCart.Execute(new Visitor(null, null, "cart-of-jane"), CancellationToken.None);

        Assert.NotEqual("cart-of-jane", cart.Id);
    }
}
