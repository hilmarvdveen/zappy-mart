using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class ProductSpecificationTests
{
    private readonly Product jacket = new ProductBuilder()
        .Named("Mens Cotton Jacket", "mens-cotton-jacket")
        .InCategory("mens-clothing")
        .WithStock(8)
        .Build();

    private readonly Product ring = new ProductBuilder()
        .Named("White Gold Plated Princess", "white-gold-plated-princess")
        .InCategory("jewellery")
        .WithStock(0)
        .Build();

    [Fact]
    public void TheWholeCatalogueKeepsEverything()
    {
        Assert.Empty(ProductSpecification.WholeCatalogue.Parts());
        Assert.True(ProductSpecification.WholeCatalogue.IsSatisfiedBy(ring));
    }

    [Fact]
    public void ACategoryNarrowsTheCatalogue()
    {
        var specification = new ProductSpecification("jewellery", null, false);

        Assert.True(specification.IsSatisfiedBy(ring));
        Assert.False(specification.IsSatisfiedBy(jacket));
    }

    [Fact]
    public void ANameIsComparedWithoutRegardToCase()
    {
        var specification = new ProductSpecification(null, "COTTON", false);

        Assert.True(specification.IsSatisfiedBy(jacket));
        Assert.False(specification.IsSatisfiedBy(ring));
    }

    [Fact]
    public void StockLeavesOutWhatIsGone()
    {
        var specification = new ProductSpecification(null, null, true);

        Assert.True(specification.IsSatisfiedBy(jacket));
        Assert.False(specification.IsSatisfiedBy(ring));
    }

    [Fact]
    public void EveryPartHasToHold()
    {
        var specification = new ProductSpecification("mens-clothing", "cotton", true);

        Assert.Equal(3, specification.Parts().Count);
        Assert.True(specification.IsSatisfiedBy(jacket));
    }
}
