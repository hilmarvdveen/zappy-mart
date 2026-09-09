using Zappy.Domain;

namespace Zappy.Application;

public sealed class ReadWishlist(IWishlistRepository wishlist, WishlistProducts wishlistProducts)
{
    public async Task<IReadOnlyList<Product>> Execute(string? ownerId, CancellationToken cancellationToken) =>
        ownerId is null
            ? []
            : await wishlistProducts.For(await wishlist.OfOwner(ownerId, cancellationToken), cancellationToken);
}
