using Zappy.Domain;

namespace Zappy.Application;

public sealed class FindProduct(IProductRepository products)
{
    public Task<Product?> Execute(string slug, CancellationToken cancellationToken) =>
        products.WithSlug(slug, cancellationToken);
}
