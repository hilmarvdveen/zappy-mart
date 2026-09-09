using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class CartTests
{
    private readonly Product shirt = new ProductBuilder()
        .WithId("product-18")
        .Named("MBJ Boat Neck", "mbj-boat-neck")
        .Costing(985)
        .WithStock(25)
        .Build();

    [Fact]
    public void ALineCarriesItsProductAndItsTotal()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        var line = Assert.Single(cart.Lines);
        Assert.Equal(shirt.Id, line.ProductId);
        Assert.Equal(2, line.Quantity);
        Assert.Equal(Money.Euro(1970), line.LineTotal);
        Assert.Equal(Money.Euro(1970), cart.Subtotal);
    }

    [Fact]
    public void AddingAProductThatIsAlreadyThereRaisesTheQuantity()
    {
        var cart = new CartBuilder().Holding(shirt).Build();

        cart.Add(shirt, 2, Moments.Now);

        Assert.Equal(3, Assert.Single(cart.Lines).Quantity);
    }

    [Fact]
    public void AQuantityBelowOneIsRefused()
    {
        var cart = new CartBuilder().Build();

        var outcome = cart.Add(shirt, 0, Moments.Now);

        Assert.Equal(UserErrorCode.QuantityInvalid, outcome.Errors.Single().Code);
        Assert.Empty(cart.Lines);
    }

    [Fact]
    public void AQuantityAboveTheStockIsRefused()
    {
        var lastOne = new ProductBuilder().WithStock(1).Build();
        var cart = new CartBuilder().Holding(lastOne).Build();

        var outcome = cart.Add(lastOne, 1, Moments.Now);

        Assert.Equal(UserErrorCode.OutOfStock, outcome.Errors.Single().Code);
        Assert.Equal(1, Assert.Single(cart.Lines).Quantity);
    }

    [Fact]
    public void AProductWithoutStockCannotEnterACart()
    {
        var sold = new ProductBuilder().WithStock(0).Build();
        var cart = new CartBuilder().Build();

        Assert.Equal(UserErrorCode.OutOfStock, cart.Add(sold, 1, Moments.Now).Errors.Single().Code);
    }

    [Fact]
    public void AQuantityIsSetToAnExactNumber()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        cart.ChangeLineQuantity(cart.Lines.Single().Id, 5, Moments.Now);

        Assert.Equal(5, cart.Lines.Single().Quantity);
    }

    [Fact]
    public void AQuantityOfZeroIsNotARemoval()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        var outcome = cart.ChangeLineQuantity(cart.Lines.Single().Id, 0, Moments.Now);

        Assert.Equal(UserErrorCode.QuantityInvalid, outcome.Errors.Single().Code);
        Assert.Single(cart.Lines);
    }

    [Fact]
    public void AnUnknownLineIsNotFound()
    {
        var cart = new CartBuilder().Holding(shirt).Build();

        Assert.Equal(
            UserErrorCode.CartLineNotFound,
            cart.RemoveLine("no-such-line", Moments.Now).Errors.Single().Code);
    }

    [Fact]
    public void ALineIsRemovedOnce()
    {
        var cart = new CartBuilder().Holding(shirt).Build();
        var lineId = cart.Lines.Single().Id;

        Assert.True(cart.RemoveLine(lineId, Moments.Now).Succeeded);
        Assert.Equal(UserErrorCode.CartLineNotFound, cart.RemoveLine(lineId, Moments.Now).Errors.Single().Code);
    }

    [Fact]
    public void ASecondCodeReplacesTheFirst()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        cart.Apply(new PromotionCodeBuilder().TakingPercent(10).Build(), Moments.Now);
        cart.Apply(new PromotionCodeBuilder().GivingFreeShipping().Build(), Moments.Now);

        Assert.Equal("FREESHIP", cart.Promotion!.Code);
        Assert.Equal(PromotionKind.FreeShipping, cart.Promotion.Kind);
    }

    [Fact]
    public void ARefusedCodeLeavesTheCartAsItWas()
    {
        var cart = new CartBuilder()
            .Holding(shirt, 2)
            .With(new PromotionCodeBuilder().TakingPercent(10).Build())
            .Build();

        var outcome = cart.Apply(new PromotionCodeBuilder().ThatClosed().Build(), Moments.Now);

        Assert.Equal(UserErrorCode.CodeExpired, outcome.Errors.Single().Code);
        Assert.Equal("WELCOME10", cart.Promotion!.Code);
    }

    [Fact]
    public void RemovingTheCodeLeavesTheLines()
    {
        var cart = new CartBuilder().Holding(shirt, 2).With(new PromotionCodeBuilder().Build()).Build();

        cart.RemovePromotion(Moments.Now);

        Assert.Null(cart.Promotion);
        Assert.Single(cart.Lines);
    }

    [Fact]
    public void ACartTakesOverTheLinesOfAnotherCart()
    {
        var other = new ProductBuilder().WithId("product-02").Named("Other", "other").Costing(500).Build();
        var anonymousCart = new CartBuilder().Holding(shirt, 2).Holding(other).Build();
        var customerCart = new CartBuilder().OwnedBy("customer-01").Holding(shirt).Build();

        customerCart.TakeOver(anonymousCart, Moments.Now);

        Assert.Equal(2, customerCart.Lines.Count);
        Assert.Equal(3, customerCart.LineFor(shirt.Id)!.Quantity);
    }

    [Fact]
    public void AnEmptiedCartKeepsNothing()
    {
        var cart = new CartBuilder().Holding(shirt).With(new PromotionCodeBuilder().Build()).Build();

        cart.Empty(Moments.Now);

        Assert.True(cart.IsEmpty);
        Assert.Null(cart.Promotion);
    }
}
