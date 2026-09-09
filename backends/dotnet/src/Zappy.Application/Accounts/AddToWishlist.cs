using Zappy.Domain;

namespace Zappy.Application;

public sealed class AddToWishlist(
    IWishlistRepository wishlist,
    IProductRepository products,
    WishlistOwner wishlistOwner,
    WishlistProducts wishlistProducts,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<WishlistResult> Execute(Visitor visitor, string productId, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var ownerId = await wishlistOwner.FindOrStartOne(visitor, token);
                var anonymousCartId = visitor.IsSignedIn ? null : ownerId;
                var entries = (await wishlist.OfOwner(ownerId, token)).ToList();

                var product = await products.WithId(productId, token);
                if (product is null)
                {
                    return WishlistResult.Refused(
                        await wishlistProducts.For(entries, token),
                        anonymousCartId,
                        UserErrorCode.ProductNotFound,
                        "No product with that id exists.",
                        "productId");
                }

                if (entries.All(entry => entry.ProductId != productId))
                {
                    var added = new WishlistEntry(ownerId, productId, clock.Now);
                    await wishlist.Add(added, token);
                    entries.Add(added);
                }

                return WishlistResult.Changed(await wishlistProducts.For(entries, token), anonymousCartId);
            },
            cancellationToken);
}
