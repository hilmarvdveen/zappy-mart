using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class WishlistRepository(ZappyDbContext database) : IWishlistRepository
{
    public async Task<IReadOnlyList<WishlistEntry>> OfOwner(string ownerId, CancellationToken cancellationToken) =>
        await database.WishlistEntries
            .Where(entry => entry.OwnerId == ownerId)
            .OrderByDescending(entry => entry.AddedAt)
            .ToListAsync(cancellationToken);

    public async Task Add(WishlistEntry entry, CancellationToken cancellationToken) =>
        await database.WishlistEntries.AddAsync(entry, cancellationToken);

    public async Task Remove(string ownerId, string productId, CancellationToken cancellationToken)
    {
        var entry = await database.WishlistEntries.SingleOrDefaultAsync(
            candidate => candidate.OwnerId == ownerId && candidate.ProductId == productId,
            cancellationToken);

        if (entry is not null)
        {
            database.WishlistEntries.Remove(entry);
        }
    }
}
