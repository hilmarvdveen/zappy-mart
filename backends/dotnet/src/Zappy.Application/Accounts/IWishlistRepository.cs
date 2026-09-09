using Zappy.Domain;

namespace Zappy.Application;

public interface IWishlistRepository
{
    Task<IReadOnlyList<WishlistEntry>> OfOwner(string ownerId, CancellationToken cancellationToken);

    Task Add(WishlistEntry entry, CancellationToken cancellationToken);

    Task Remove(string ownerId, string productId, CancellationToken cancellationToken);
}
