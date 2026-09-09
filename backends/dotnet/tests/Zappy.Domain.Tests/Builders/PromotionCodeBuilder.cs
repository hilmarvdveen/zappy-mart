using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PromotionCodeBuilder
{
    private string code = "WELCOME10";
    private PromotionKind kind = PromotionKind.Percentage;
    private int? percentage = 10;
    private Money? amount;
    private Money? minimumSubtotal;
    private DateTimeOffset validFrom = Moments.Now.AddYears(-1);
    private DateTimeOffset validUntil = Moments.Now.AddYears(1);
    private int? usageLimit;
    private int timesUsed;

    public PromotionCodeBuilder TakingPercent(int percent)
    {
        code = "WELCOME10";
        kind = PromotionKind.Percentage;
        percentage = percent;
        return this;
    }

    public PromotionCodeBuilder TakingCents(int cents)
    {
        code = "FIVEOFF";
        kind = PromotionKind.FixedAmount;
        percentage = null;
        amount = Money.Euro(cents);
        return this;
    }

    public PromotionCodeBuilder GivingFreeShipping()
    {
        code = "FREESHIP";
        kind = PromotionKind.FreeShipping;
        percentage = null;
        return this;
    }

    public PromotionCodeBuilder AskingAtLeast(int cents)
    {
        minimumSubtotal = Money.Euro(cents);
        return this;
    }

    public PromotionCodeBuilder ThatClosed()
    {
        validFrom = Moments.Now.AddYears(-2);
        validUntil = Moments.Now.AddYears(-1);
        return this;
    }

    public PromotionCodeBuilder UsedUp()
    {
        usageLimit = 1;
        timesUsed = 1;
        return this;
    }

    public PromotionCode Build() =>
        new(code, kind, percentage, amount, minimumSubtotal, validFrom, validUntil, usageLimit, timesUsed);
}
