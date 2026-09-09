using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class TotalsTests
{
    [Fact]
    public void AnEmptyCartPaysNothingAtAll()
    {
        var totals = Totals.For(Money.Euro(0), null);

        Assert.Equal(Money.Euro(0), totals.Subtotal);
        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(0), totals.Discount);
        Assert.Equal(Money.Euro(0), totals.Total);
    }

    [Fact]
    public void ShippingIs495BelowFiveThousand()
    {
        var totals = Totals.For(Money.Euro(1970), null);

        Assert.Equal(Money.Euro(495), totals.Shipping);
        Assert.Equal(Money.Euro(2465), totals.Total);
    }

    [Fact]
    public void ShippingIsFreeFromFiveThousand()
    {
        var totals = Totals.For(Money.Euro(5000), null);

        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(5000), totals.Total);
    }

    [Fact]
    public void AFreeShippingCodeTakesNothingOffAndMakesShippingZero()
    {
        var totals = Totals.For(Money.Euro(1970), new FreeShipping());

        Assert.Equal(Money.Euro(0), totals.Discount);
        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(1970), totals.Total);
    }

    [Fact]
    public void APercentageRoundsHalfUpToWholeCents()
    {
        var totals = Totals.For(Money.Euro(5599), new PercentageOffSubtotal(10));

        Assert.Equal(Money.Euro(560), totals.Discount);
        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(5039), totals.Total);
    }

    [Fact]
    public void AFixedAmountIsCappedAtTheSubtotal()
    {
        var totals = Totals.For(Money.Euro(300), new FixedAmountOffSubtotal(Money.Euro(500)));

        Assert.Equal(Money.Euro(300), totals.Discount);
        Assert.Equal(Money.Euro(495), totals.Shipping);
        Assert.Equal(Money.Euro(495), totals.Total);
    }

    [Fact]
    public void TheEquationHoldsForEveryKindOfCode()
    {
        foreach (var rule in new PromotionRule[]
        {
            new PercentageOffSubtotal(10),
            new FixedAmountOffSubtotal(Money.Euro(500)),
            new FreeShipping()
        })
        {
            var totals = Totals.For(Money.Euro(1970), rule);

            Assert.Equal(totals.Subtotal.Plus(totals.Shipping).Minus(totals.Discount), totals.Total);
        }
    }
}
