namespace Zappy.Domain;

public abstract record PromotionRule
{
    public abstract PromotionKind Kind { get; }

    public abstract Money DiscountFor(Money subtotal);

    public virtual Money ShippingFor(Money shippingBeforeThePromotion) => shippingBeforeThePromotion;
}
