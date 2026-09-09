namespace Zappy.Domain;

public sealed record AppliedPromotion(string Code, PromotionKind Kind, Money Discount);
