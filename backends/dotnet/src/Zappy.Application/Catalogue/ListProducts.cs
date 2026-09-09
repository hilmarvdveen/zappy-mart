using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListProducts(IProductRepository products)
{
    public const int DefaultPageSize = 24;

    public Task<Page<Product>> Execute(
        ProductSpecification specification,
        int? first,
        string? after,
        CancellationToken cancellationToken) =>
        products.Matching(
            specification,
            PageSize.Clamp(first, DefaultPageSize),
            Cursor.IdentifierIn(after),
            cancellationToken);
}
