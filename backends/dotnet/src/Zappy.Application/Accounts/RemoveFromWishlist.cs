using Zappy.Domain;

namespace Zappy.Application;

public sealed class RemoveFromWishlist(
    IWishlistRepository wishlist,
    WishlistOwner wishlistOwner,
    WishlistProducts wishlistProducts,
    IUnitOfWork unitOfWork)
{
    public Task<WishlistResult> Execute(Visitor visitor, string productId, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var ownerId = await wishlistOwner.Find(visitor, token);
                if (ownerId is null)
                {
                    return WishlistResult.Changed([], null);
                }

                var anonymousCartId = visitor.IsSignedIn ? null : ownerId;
                var entries = (await wishlist.OfOwner(ownerId, token)).ToList();
                await wishlist.Remove(ownerId, productId, token);
                entries.RemoveAll(entry => entry.ProductId == productId);

                return WishlistResult.Changed(await wishlistProducts.For(entries, token), anonymousCartId);
            },
            cancellationToken);
}
