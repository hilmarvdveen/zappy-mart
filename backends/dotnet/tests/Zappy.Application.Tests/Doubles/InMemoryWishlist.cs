using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryWishlist : IWishlistRepository
{
    public List<WishlistEntry> Entries { get; } = [];

    public Task<IReadOnlyList<WishlistEntry>> OfOwner(string ownerId, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<WishlistEntry>>(
            [.. Entries.Where(entry => entry.OwnerId == ownerId).OrderByDescending(entry => entry.AddedAt)]);

    public Task Add(WishlistEntry entry, CancellationToken cancellationToken)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task Remove(string ownerId, string productId, CancellationToken cancellationToken)
    {
        Entries.RemoveAll(entry => entry.OwnerId == ownerId && entry.ProductId == productId);
        return Task.CompletedTask;
    }
}
