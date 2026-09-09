namespace Zappy.Domain;

public sealed record PercentageOffSubtotal(int Percentage) : PromotionRule
{
    public override PromotionKind Kind => PromotionKind.Percentage;

    public override Money DiscountFor(Money subtotal)
    {
        var hundredths = (long)subtotal.Amount * Percentage;
        var roundedHalfUp = (int)((hundredths + 50) / 100);
        return new Money(roundedHalfUp, subtotal.Currency).CappedAt(subtotal);
    }
}
