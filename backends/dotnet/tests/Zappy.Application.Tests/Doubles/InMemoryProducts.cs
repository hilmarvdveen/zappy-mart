using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryProducts(params Product[] products) : IProductRepository
{
    private readonly List<Product> catalogue = [.. products];

    public Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken)
    {
        var matching = catalogue.Where(specification.IsSatisfiedBy).ToList();
        var start = afterProductId is null ? 0 : matching.FindIndex(product => product.Id == afterProductId) + 1;
        var page = matching.Skip(start).Take(first).ToList();
        return Task.FromResult(new Page<Product>(page, start + page.Count < matching.Count, matching.Count));
    }

    public Task<Product?> WithSlug(string slug, CancellationToken cancellationToken) =>
        Task.FromResult(catalogue.SingleOrDefault(product => product.Slug == slug));

    public Task<Product?> WithId(string id, CancellationToken cancellationToken) =>
        Task.FromResult(catalogue.SingleOrDefault(product => product.Id == id));

    public Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Product>>([.. catalogue.Where(product => ids.Contains(product.Id))]);
}
