using Zappy.Domain;

namespace Zappy.Application;

public interface IProductRepository
{
    Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken);

    Task<Product?> WithSlug(string slug, CancellationToken cancellationToken);

    Task<Product?> WithId(string id, CancellationToken cancellationToken);

    Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken);
}
