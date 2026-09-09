using Microsoft.Extensions.Caching.Memory;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CachedProductRepository(
    IProductRepository catalogue,
    IMemoryCache cache,
    ProductCatalogueVersion version) : IProductRepository
{
    private static readonly TimeSpan HowLongAPageStaysFresh = TimeSpan.FromMinutes(5);

    public Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken) =>
        Remember(
            $"products:{version.Current}:{specification}:{first}:{afterProductId}",
            () => catalogue.Matching(specification, first, afterProductId, cancellationToken));

    public Task<Product?> WithSlug(string slug, CancellationToken cancellationToken) =>
        Remember($"product:{version.Current}:{slug}", () => catalogue.WithSlug(slug, cancellationToken));

    public Task<Product?> WithId(string id, CancellationToken cancellationToken) =>
        catalogue.WithId(id, cancellationToken);

    public Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken) =>
        catalogue.WithIds(ids, cancellationToken);

    private Task<TAnswer> Remember<TAnswer>(string key, Func<Task<TAnswer>> read) =>
        cache.GetOrCreateAsync(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = HowLongAPageStaysFresh;
            return read();
        })!;
}
