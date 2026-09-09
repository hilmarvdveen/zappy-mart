using Microsoft.Extensions.Caching.Memory;
using Zappy.Adapters.Persistence;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Tests;

public sealed class CachedProductRepositoryTests
{
    private readonly CountingProducts inner = new();
    private readonly ProductCatalogueVersion version = new();
    private readonly MemoryCache cache = new(new MemoryCacheOptions());

    [Fact]
    public async Task TheSamePageIsReadOnceAndAnsweredTwice()
    {
        var cached = ACachedRepository();

        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);
        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(1, inner.TimesAsked);
    }

    [Fact]
    public async Task ADifferentPageIsADifferentRead()
    {
        var cached = ACachedRepository();

        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);
        await cached.Matching(ProductSpecification.WholeCatalogue, 24, "product-01", TestContext.Current.CancellationToken);
        await cached.Matching(new ProductSpecification("jewellery", null, false), 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(3, inner.TimesAsked);
    }

    [Fact]
    public async Task AChangedCatalogueIsReadAgain()
    {
        var cached = ACachedRepository();

        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);
        version.Bump();
        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(2, inner.TimesAsked);
    }

    [Fact]
    public async Task AProductForAMutationIsNeverServedFromTheCache()
    {
        var cached = ACachedRepository();

        await cached.WithId("product-01", TestContext.Current.CancellationToken);
        await cached.WithId("product-01", TestContext.Current.CancellationToken);

        Assert.Equal(2, inner.TimesAsked);
    }

    private CachedProductRepository ACachedRepository() => new(inner, cache, version);

    private sealed class CountingProducts : IProductRepository
    {
        public int TimesAsked { get; private set; }

        public Task<Page<Product>> Matching(
            ProductSpecification specification,
            int first,
            string? afterProductId,
            CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult(Page<Product>.Empty);
        }

        public Task<Product?> WithSlug(string slug, CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult<Product?>(null);
        }

        public Task<Product?> WithId(string id, CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult<Product?>(null);
        }

        public Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult<IReadOnlyList<Product>>([]);
        }
    }
}
