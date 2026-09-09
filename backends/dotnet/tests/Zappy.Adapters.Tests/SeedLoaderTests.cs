using Microsoft.EntityFrameworkCore;
using Zappy.Domain;

namespace Zappy.Adapters.Tests;

public sealed class SeedLoaderTests : IDisposable
{
    private readonly ASqliteStore store = new();

    [Fact]
    public async Task TheSeedLoadsTheWholeStore()
    {
        var loaded = await store.LoadTheSeed();

        Assert.Equal(20, loaded);
        Assert.Equal(20, await store.Database.Products.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(4, await store.Database.Categories.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(5, await store.Database.PromotionCodes.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(1, await store.Database.Customers.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task TheCatalogueKeepsTheOrderOfTheSeedFile()
    {
        await store.LoadTheSeed();

        var catalogue = await store.Database.Products
            .OrderBy(product => product.CatalogueOrder)
            .Select(product => product.Id)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.Equal("product-01", catalogue[0]);
        Assert.Equal("product-20", catalogue[^1]);
    }

    [Fact]
    public async Task TheTwoStockRulesOfTheSeedHold()
    {
        await store.LoadTheSeed();

        var ring = await store.Database.Products.SingleAsync(
            product => product.Id == "product-07", TestContext.Current.CancellationToken);
        var drive = await store.Database.Products.SingleAsync(
            product => product.Id == "product-12", TestContext.Current.CancellationToken);

        Assert.Equal(0, ring.Stock);
        Assert.Equal(1, drive.Stock);
    }

    [Fact]
    public async Task ThePriceIsAnIntegerAmountInEuro()
    {
        await store.LoadTheSeed();

        var jacket = await store.Database.Products.SingleAsync(
            product => product.Slug == "mens-cotton-jacket", TestContext.Current.CancellationToken);

        Assert.Equal(Money.Euro(5599), jacket.Price);
    }

    [Fact]
    public async Task ThePasswordOfTheSeedCustomerIsHashedAndVerifies()
    {
        await store.LoadTheSeed();

        var customer = await store.Database.Customers.SingleAsync(TestContext.Current.CancellationToken);

        Assert.StartsWith("$argon2id$", customer.PasswordHash, StringComparison.Ordinal);
        Assert.DoesNotContain("correct horse battery staple", customer.PasswordHash, StringComparison.Ordinal);
        Assert.True(store.PasswordHasher.Matches("correct horse battery staple", customer.PasswordHash));
    }

    [Fact]
    public async Task ThePromotionCodesCarryTheirWindowsAndTheirUses()
    {
        await store.LoadTheSeed();

        var once = await store.Database.PromotionCodes.SingleAsync(
            code => code.Code == "ONCE", TestContext.Current.CancellationToken);
        var fiveOff = await store.Database.PromotionCodes.SingleAsync(
            code => code.Code == "FIVEOFF", TestContext.Current.CancellationToken);

        Assert.Equal(1, once.UsageLimit);
        Assert.Equal(1, once.TimesUsed);
        Assert.Equal(Money.Euro(500), fiveOff.Amount);
        Assert.Equal(Money.Euro(2500), fiveOff.MinimumSubtotal);
    }

    [Fact]
    public async Task LoadingTheSeedAgainThrowsTheOldStoreAway()
    {
        await store.LoadTheSeed();
        store.Database.Carts.Add(new Cart("cart-01", null, DateTimeOffset.UtcNow));
        await store.Database.SaveChangesAsync(TestContext.Current.CancellationToken);

        await store.LoadTheSeed();

        Assert.Equal(0, await store.Database.Carts.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(20, await store.Database.Products.CountAsync(TestContext.Current.CancellationToken));
    }

    public void Dispose() => store.Dispose();
}
