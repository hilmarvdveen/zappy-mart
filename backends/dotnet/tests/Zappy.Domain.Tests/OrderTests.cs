using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class OrderTests
{
    private readonly Product shirt = new ProductBuilder()
        .WithId("product-18")
        .Named("MBJ Boat Neck", "mbj-boat-neck")
        .Costing(985)
        .WithStock(25)
        .Build();

    [Fact]
    public void AnOrderKeepsTheNamesAndThePricesOfTheMoment()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        var line = Assert.Single(order.Lines);
        Assert.Equal("MBJ Boat Neck", line.ProductName);
        Assert.Equal(Money.Euro(985), line.UnitPrice);
        Assert.Equal(Money.Euro(1970), line.LineTotal);
        Assert.Equal(OrderStatus.Paid, order.Status);
    }

    [Fact]
    public void AnOrderCopiesTheTotalsTheCartShowed()
    {
        var cart = new CartBuilder()
            .Holding(shirt, 2)
            .With(new PromotionCodeBuilder().TakingPercent(10).Build())
            .Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        Assert.Equal(Money.Euro(1970), order.Subtotal);
        Assert.Equal(Money.Euro(197), order.Discount);
        Assert.Equal(Money.Euro(495), order.Shipping);
        Assert.Equal(Money.Euro(2268), order.Total);
        Assert.Equal("WELCOME10", order.PromotionCode);
    }

    [Fact]
    public void PlacingAnOrderReservesTheStockAndEmptiesTheCart()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        Order.Place(cart, "customer-01", Moments.Now);

        Assert.Equal(23, shirt.Stock);
        Assert.True(cart.IsEmpty);
    }

    [Fact]
    public void AnEmptyCartHasNothingToOrder()
    {
        var outcome = Order.Place(new CartBuilder().Build(), "customer-01", Moments.Now);

        Assert.Equal(UserErrorCode.CartEmpty, outcome.Errors.Single().Code);
    }

    [Fact]
    public void OneLineWithoutStockStopsTheWholeOrder()
    {
        var lastOne = new ProductBuilder()
            .WithId("product-12")
            .Named("Gaming drive", "gaming-drive")
            .WithStock(1)
            .Build();
        var cart = new CartBuilder().Holding(shirt, 2).Holding(lastOne).Build();
        lastOne.Reserve(1);

        var outcome = Order.Place(cart, "customer-01", Moments.Now);

        Assert.Equal(UserErrorCode.OutOfStock, outcome.Errors.Single().Code);
        Assert.Contains("Gaming drive", outcome.Errors.Single().Message, StringComparison.Ordinal);
        Assert.Equal(25, shirt.Stock);
        Assert.False(cart.IsEmpty);
    }

    [Fact]
    public void PlacingAnOrderRaisesTheEventTheOtherModulesReactTo()
    {
        var cart = new CartBuilder().Holding(shirt, 2).With(new PromotionCodeBuilder().Build()).Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        var raised = Assert.IsType<OrderPlaced>(Assert.Single(order.RaisedEvents));
        Assert.Equal(order.Id, raised.OrderId);
        Assert.Equal("customer-01", raised.CustomerId);
        Assert.Equal("WELCOME10", raised.PromotionCode);
    }

    [Fact]
    public void AnOrderNumberIsSafeToShow()
    {
        var cart = new CartBuilder().Holding(shirt).Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        Assert.StartsWith("ZAPPY-20260909-", order.Number, StringComparison.Ordinal);
        Assert.DoesNotContain(order.Id, order.Number, StringComparison.Ordinal);
    }
}
