using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class OrderUseCaseTests
{
    private readonly Store store = new(Store.AProduct());

    [Fact]
    public async Task PlacingAnOrderNeedsASignedInCustomer()
    {
        var result = await store.PlaceOrder.Execute(Visitor.Anonymous, null, CancellationToken.None);

        Assert.Equal(UserErrorCode.NotAuthenticated, result.Errors.Single().Code);
    }

    [Fact]
    public async Task ACustomerWithoutACartHasNothingToOrder()
    {
        var result = await store.PlaceOrder.Execute(
            new Visitor("customer-01", "session-01", null),
            null,
            CancellationToken.None);

        Assert.Equal(UserErrorCode.CartEmpty, result.Errors.Single().Code);
    }

    [Fact]
    public async Task AnOrderEmptiesTheCartAndTheSecondCallSaysSo()
    {
        var visitor = await ACustomerWithACart();

        var first = await store.PlaceOrder.Execute(visitor, "checkout-1", CancellationToken.None);
        var second = await store.PlaceOrder.Execute(visitor, "checkout-1", CancellationToken.None);

        Assert.True(first.Succeeded);
        Assert.Equal(UserErrorCode.CartEmpty, second.Errors.Single().Code);
        Assert.Single(store.Orders.Orders);
    }

    [Fact]
    public async Task AnOrderRaisesTheEventTheMailAndThePromotionsReactTo()
    {
        var visitor = await ACustomerWithACart();

        await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        Assert.IsType<OrderPlaced>(Assert.Single(store.Dispatcher.Dispatched));
    }

    [Fact]
    public async Task TheConfirmationMailNamesTheOrder()
    {
        var visitor = await ACustomerWithACart();
        var placed = await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        await store.SendOrderConfirmation.Handle(
            (OrderPlaced)store.Dispatcher.Dispatched.Single(),
            CancellationToken.None);

        Assert.Equal(placed.Value!.Number, store.Mailer.Sent.Single().Number);
    }

    [Fact]
    public async Task ThePromotionModuleCountsTheUse()
    {
        var visitor = await ACustomerWithACart();
        await store.ApplyPromotionCode.Execute(visitor, "WELCOME10", CancellationToken.None);
        await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        await store.RecordPromotionUse.Handle(
            (OrderPlaced)store.Dispatcher.Dispatched.Single(),
            CancellationToken.None);

        Assert.Equal(1, store.PromotionCodes.Codes.Single(code => code.Code == "WELCOME10").TimesUsed);
    }

    [Fact]
    public async Task AnOrderWithoutACodeCountsNothing()
    {
        var visitor = await ACustomerWithACart();
        await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        await store.RecordPromotionUse.Handle(
            (OrderPlaced)store.Dispatcher.Dispatched.Single(),
            CancellationToken.None);

        Assert.Equal(0, store.PromotionCodes.Codes.Single(code => code.Code == "WELCOME10").TimesUsed);
    }

    private async Task<Visitor> ACustomerWithACart()
    {
        var registered = await store.RegisterCustomer.Execute(
            Visitor.Anonymous,
            "jane@example.com",
            "Jane Doe",
            "correct horse battery staple",
            "Chrome on Windows",
            "127.0.0.1",
            CancellationToken.None);

        var visitor = new Visitor(registered.Value!.Customer.Id, registered.Value.SessionId, null);
        await store.AddToCart.Execute(visitor, "product-18", 2, CancellationToken.None);
        return visitor;
    }
}
