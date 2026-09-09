namespace Zappy.Domain;

public sealed class PromotionCode
{
    private PromotionCode()
    {
    }

    public PromotionCode(
        string code,
        PromotionKind kind,
        int? percentage,
        Money? amount,
        Money? minimumSubtotal,
        DateTimeOffset validFrom,
        DateTimeOffset validUntil,
        int? usageLimit,
        int timesUsed)
    {
        Code = code.Trim().ToUpperInvariant();
        Kind = kind;
        Percentage = percentage;
        Amount = amount;
        MinimumSubtotal = minimumSubtotal;
        ValidFrom = validFrom;
        ValidUntil = validUntil;
        UsageLimit = usageLimit;
        TimesUsed = timesUsed;
    }

    public string Code { get; private set; } = null!;

    public PromotionKind Kind { get; private set; }

    public int? Percentage { get; private set; }

    public Money? Amount { get; private set; }

    public Money? MinimumSubtotal { get; private set; }

    public DateTimeOffset ValidFrom { get; private set; }

    public DateTimeOffset ValidUntil { get; private set; }

    public int? UsageLimit { get; private set; }

    public int TimesUsed { get; private set; }

    public PromotionRule Rule => Kind switch
    {
        PromotionKind.Percentage => new PercentageOffSubtotal(Percentage ?? 0),
        PromotionKind.FixedAmount => new FixedAmountOffSubtotal(Amount ?? Money.Euro(0)),
        PromotionKind.FreeShipping => new FreeShipping(),
        _ => throw new InvalidOperationException($"{Code} carries the unknown kind {Kind}.")
    };

    public static string Normalise(string code) => code.Trim().ToUpperInvariant();

    public Result<PromotionRule> RuleFor(Money subtotal, DateTimeOffset moment)
    {
        if (moment < ValidFrom || moment > ValidUntil)
        {
            return Result<PromotionRule>.Failure(
                UserErrorCode.CodeExpired,
                $"The promotion code {Code} is outside its validity window.",
                "code");
        }

        if (UsageLimit is not null && TimesUsed >= UsageLimit)
        {
            return Result<PromotionRule>.Failure(
                UserErrorCode.CodeExhausted,
                $"The promotion code {Code} has reached its usage limit.",
                "code");
        }

        if (MinimumSubtotal is not null && !subtotal.IsAtLeast(MinimumSubtotal))
        {
            return Result<PromotionRule>.Failure(
                UserErrorCode.CodeMinimumNotMet,
                $"The promotion code {Code} asks for a subtotal of at least {MinimumSubtotal}.",
                "code");
        }

        return Result<PromotionRule>.Success(Rule);
    }

    public void RecordUse() => TimesUsed += 1;
}
