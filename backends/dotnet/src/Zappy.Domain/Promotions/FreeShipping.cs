namespace Zappy.Domain;

public sealed record FreeShipping : PromotionRule
{
    public override PromotionKind Kind => PromotionKind.FreeShipping;

    public override Money DiscountFor(Money subtotal) => Money.ZeroIn(subtotal.Currency);

    public override Money ShippingFor(Money shippingBeforeThePromotion) =>
        Money.ZeroIn(shippingBeforeThePromotion.Currency);
}
