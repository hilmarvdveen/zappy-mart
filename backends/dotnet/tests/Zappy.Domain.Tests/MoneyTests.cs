using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class MoneyTests
{
    [Fact]
    public void AnAmountIsNeverNegative() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => Money.Euro(-1));

    [Fact]
    public void TwoAmountsOfTheSameValueAreEqual() =>
        Assert.Equal(Money.Euro(495), Money.Euro(495));

    [Fact]
    public void AmountsAddAndSubtractWithinOneCurrency()
    {
        Assert.Equal(Money.Euro(1495), Money.Euro(1000).Plus(Money.Euro(495)));
        Assert.Equal(Money.Euro(505), Money.Euro(1000).Minus(Money.Euro(495)));
    }

    [Fact]
    public void AnAmountMultipliesByAQuantity() =>
        Assert.Equal(Money.Euro(1970), Money.Euro(985).Times(2));

    [Fact]
    public void AmountsInDifferentCurrenciesCannotBeCombined() =>
        Assert.Throws<InvalidOperationException>(() => Money.Euro(100).Plus(new Money(100, "USD")));

    [Fact]
    public void AnAmountIsCappedAtACeiling()
    {
        Assert.Equal(Money.Euro(500), Money.Euro(900).CappedAt(Money.Euro(500)));
        Assert.Equal(Money.Euro(300), Money.Euro(300).CappedAt(Money.Euro(500)));
    }
}
