using Zappy.Domain;

namespace Zappy.Application;

public sealed class WishlistProducts(IProductRepository products)
{
    public async Task<IReadOnlyList<Product>> For(
        IReadOnlyList<WishlistEntry> entries,
        CancellationToken cancellationToken)
    {
        if (entries.Count == 0)
        {
            return [];
        }

        var saved = await products.WithIds([.. entries.Select(entry => entry.ProductId)], cancellationToken);
        return
        [
            .. entries
                .OrderByDescending(entry => entry.AddedAt)
                .Select(entry => saved.SingleOrDefault(product => product.Id == entry.ProductId))
                .OfType<Product>()
        ];
    }
}
