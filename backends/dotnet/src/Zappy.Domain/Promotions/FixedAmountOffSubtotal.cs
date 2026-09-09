namespace Zappy.Domain;

public sealed record FixedAmountOffSubtotal(Money Amount) : PromotionRule
{
    public override PromotionKind Kind => PromotionKind.FixedAmount;

    public override Money DiscountFor(Money subtotal) => Amount.CappedAt(subtotal);
}
