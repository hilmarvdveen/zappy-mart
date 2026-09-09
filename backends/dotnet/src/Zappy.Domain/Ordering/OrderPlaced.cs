namespace Zappy.Domain;

public sealed record OrderPlaced(string OrderId, string CustomerId, string? PromotionCode) : DomainEvent;
