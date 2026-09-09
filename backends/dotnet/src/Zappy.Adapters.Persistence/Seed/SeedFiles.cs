namespace Zappy.Adapters.Persistence;

public sealed record SeedMoney(int Amount, string Currency);

public sealed record SeedCategory(string Id, string Name, string Slug);

public sealed record SeedProduct(
    string Id,
    string Name,
    string Slug,
    string Description,
    SeedMoney Price,
    string CategorySlug,
    int Stock,
    string? ImageUrl);

public sealed record SeedPromotionCode(
    string Code,
    string Kind,
    int? Percentage,
    SeedMoney? Amount,
    SeedMoney? MinimumSubtotal,
    DateTimeOffset ValidFrom,
    DateTimeOffset ValidUntil,
    int? UsageLimit,
    int TimesUsed);

public sealed record SeedCustomer(
    string Id,
    string Email,
    string Name,
    string Password,
    DateTimeOffset CreatedAt,
    IReadOnlyList<string> Wishlist);
