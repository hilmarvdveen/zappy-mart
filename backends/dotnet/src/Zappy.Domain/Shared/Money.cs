namespace Zappy.Domain;

public sealed record Money
{
    public const string EuroCurrency = "EUR";

    public Money(int amount, string currency)
    {
        if (amount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), amount, "An amount of money is never negative.");
        }

        if (string.IsNullOrWhiteSpace(currency))
        {
            throw new ArgumentException("An amount of money always names its currency.", nameof(currency));
        }

        Amount = amount;
        Currency = currency;
    }

    public int Amount { get; }

    public string Currency { get; }

    public bool IsZero => Amount == 0;

    public static Money Euro(int amount) => new(amount, EuroCurrency);

    public static Money ZeroIn(string currency) => new(0, currency);

    public Money Plus(Money other) => new(Amount + AmountOf(other), Currency);

    public Money Minus(Money other) => new(Amount - AmountOf(other), Currency);

    public Money Times(int factor) => new(Amount * factor, Currency);

    public bool IsAtLeast(Money other) => Amount >= AmountOf(other);

    public Money CappedAt(Money ceiling) => IsAtLeast(ceiling) ? ceiling : this;

    public override string ToString() => $"{Amount} {Currency}";

    private int AmountOf(Money other) => other.Currency == Currency
        ? other.Amount
        : throw new InvalidOperationException($"An amount in {Currency} cannot be combined with an amount in {other.Currency}.");
}
