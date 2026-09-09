namespace Zappy.Domain;

public sealed record Totals(Money Subtotal, Money Shipping, Money Discount, Money Total)
{
    public static readonly Money StandardShipping = Money.Euro(495);

    public static readonly Money FreeShippingFrom = Money.Euro(5000);

    public static Totals For(Money subtotal, PromotionRule? promotionRule)
    {
        var nothing = Money.ZeroIn(subtotal.Currency);
        var discount = promotionRule is null ? nothing : promotionRule.DiscountFor(subtotal).CappedAt(subtotal);
        var charged = subtotal.IsZero || subtotal.IsAtLeast(FreeShippingFrom) ? nothing : StandardShipping;
        var shipping = promotionRule is null ? charged : promotionRule.ShippingFor(charged);
        return new Totals(subtotal, shipping, discount, subtotal.Plus(shipping).Minus(discount));
    }
}
