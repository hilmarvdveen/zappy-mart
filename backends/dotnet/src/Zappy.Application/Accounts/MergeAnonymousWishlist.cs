using Zappy.Domain;

namespace Zappy.Application;

public sealed class MergeAnonymousWishlist(IWishlistRepository wishlist)
{
    public async Task Execute(Customer customer, Visitor visitor, CancellationToken cancellationToken)
    {
        if (visitor.AnonymousCartId is null)
        {
            return;
        }

        var anonymousEntries = await wishlist.OfOwner(visitor.AnonymousCartId, cancellationToken);
        if (anonymousEntries.Count == 0)
        {
            return;
        }

        var alreadySaved = await wishlist.OfOwner(customer.Id, cancellationToken);
        foreach (var entry in anonymousEntries)
        {
            await wishlist.Remove(visitor.AnonymousCartId, entry.ProductId, cancellationToken);
            if (alreadySaved.All(saved => saved.ProductId != entry.ProductId))
            {
                await wishlist.Add(new WishlistEntry(customer.Id, entry.ProductId, entry.AddedAt), cancellationToken);
            }
        }
    }
}
