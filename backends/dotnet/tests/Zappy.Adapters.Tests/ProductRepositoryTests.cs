using Zappy.Adapters.Persistence;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Tests;

public sealed class ProductRepositoryTests : IDisposable
{
    private readonly ASqliteStore store = new();

    [Fact]
    public async Task ThePageStopsAtTheAskedSize()
    {
        var products = await ALoadedCatalogue();

        var page = await products.Matching(
            ProductSpecification.WholeCatalogue, 5, null, TestContext.Current.CancellationToken);

        Assert.Equal(5, page.Items.Count);
        Assert.Equal(20, page.TotalCount);
        Assert.True(page.HasNextPage);
        Assert.Equal("product-01", page.Items[0].Id);
    }

    [Fact]
    public async Task ACursorContinuesWhereThePageStopped()
    {
        var products = await ALoadedCatalogue();

        var page = await products.Matching(
            ProductSpecification.WholeCatalogue, 5, "product-05", TestContext.Current.CancellationToken);

        Assert.Equal("product-06", page.Items[0].Id);
    }

    [Fact]
    public async Task TheLastPageSaysSo()
    {
        var products = await ALoadedCatalogue();

        var page = await products.Matching(
            ProductSpecification.WholeCatalogue, 100, null, TestContext.Current.CancellationToken);

        Assert.Equal(20, page.Items.Count);
        Assert.False(page.HasNextPage);
    }

    [Fact]
    public async Task TheSpecificationReachesTheDatabase()
    {
        var products = await ALoadedCatalogue();

        var jewellery = await products.Matching(
            new ProductSpecification("jewellery", null, false), 24, null, TestContext.Current.CancellationToken);
        var byName = await products.Matching(
            new ProductSpecification(null, "COTTON", false), 24, null, TestContext.Current.CancellationToken);
        var inStock = await products.Matching(
            new ProductSpecification(null, null, true), 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(4, jewellery.TotalCount);
        Assert.Equal(2, byName.TotalCount);
        Assert.Equal("mens-cotton-jacket", byName.Items[0].Slug);
        Assert.Equal(19, inStock.TotalCount);
    }

    [Fact]
    public async Task AProductCarriesItsCategory()
    {
        var products = await ALoadedCatalogue();

        var product = await products.WithSlug("mens-cotton-jacket", TestContext.Current.CancellationToken);

        Assert.Equal("Men's clothing", product!.Category.Name);
        Assert.Equal(Money.Euro(5599), product.Price);
    }

    public void Dispose() => store.Dispose();

    private async Task<IProductRepository> ALoadedCatalogue()
    {
        await store.LoadTheSeed();
        return new ProductRepository(store.Database);
    }
}
