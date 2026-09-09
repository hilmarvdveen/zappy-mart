using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PercentageRoundingTests
{
    [Theory]
    [InlineData(5599, 10, 560)]
    [InlineData(1970, 10, 197)]
    [InlineData(105, 10, 11)]
    [InlineData(104, 10, 10)]
    [InlineData(1, 50, 1)]
    public void APercentageRoundsHalfUp(int subtotal, int percentage, int discount) =>
        Assert.Equal(
            Money.Euro(discount),
            new PercentageOffSubtotal(percentage).DiscountFor(Money.Euro(subtotal)));

    [Fact]
    public void ADiscountNeverPassesTheSubtotal() =>
        Assert.Equal(
            Money.Euro(1000),
            new PercentageOffSubtotal(200).DiscountFor(Money.Euro(1000)));
}
