namespace Zappy.Domain;

public sealed class WishlistEntry
{
    private WishlistEntry()
    {
    }

    public WishlistEntry(string ownerId, string productId, DateTimeOffset addedAt)
    {
        OwnerId = ownerId;
        ProductId = productId;
        AddedAt = addedAt;
    }

    public string OwnerId { get; private set; } = null!;

    public string ProductId { get; private set; } = null!;

    public DateTimeOffset AddedAt { get; private set; }
}
