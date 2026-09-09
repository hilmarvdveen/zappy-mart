using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class ListProductsTests
{
    private readonly Store store = new(
        [.. Enumerable.Range(1, 120).Select(number => Store.AProduct($"product-{number:00}"))]);

    [Fact]
    public async Task APageIsAtMostOneHundred()
    {
        var page = await store.ListProducts.Execute(ProductSpecification.WholeCatalogue, 500, null, CancellationToken.None);

        Assert.Equal(100, page.Items.Count);
        Assert.Equal(120, page.TotalCount);
        Assert.True(page.HasNextPage);
    }

    [Fact]
    public async Task TheDefaultPageIsTwentyFour()
    {
        var page = await store.ListProducts.Execute(ProductSpecification.WholeCatalogue, null, null, CancellationToken.None);

        Assert.Equal(24, page.Items.Count);
    }

    [Fact]
    public async Task ACursorStartsThePageAfterIt()
    {
        var first = await store.ListProducts.Execute(ProductSpecification.WholeCatalogue, 2, null, CancellationToken.None);

        var second = await store.ListProducts.Execute(
            ProductSpecification.WholeCatalogue,
            2,
            Cursor.For(first.Items[^1].Id),
            CancellationToken.None);

        Assert.Equal("product-03", second.Items[0].Id);
    }

    [Fact]
    public void ACursorSurvivesTheRoundTrip() =>
        Assert.Equal("product-07", Cursor.IdentifierIn(Cursor.For("product-07")));

    [Fact]
    public void ACursorThatIsNotACursorStartsAtTheBeginning() =>
        Assert.Null(Cursor.IdentifierIn("not a cursor at all"));
}
