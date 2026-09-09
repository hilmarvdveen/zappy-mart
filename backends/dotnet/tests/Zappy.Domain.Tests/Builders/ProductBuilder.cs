using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class ProductBuilder
{
    private string id = "product-01";
    private string name = "A product";
    private string slug = "a-product";
    private string categorySlug = "electronics";
    private int priceInCents = 1000;
    private int stock = 10;
    private int catalogueOrder = 1;

    public ProductBuilder WithId(string productId)
    {
        id = productId;
        return this;
    }

    public ProductBuilder Named(string productName, string productSlug)
    {
        name = productName;
        slug = productSlug;
        return this;
    }

    public ProductBuilder Costing(int cents)
    {
        priceInCents = cents;
        return this;
    }

    public ProductBuilder WithStock(int available)
    {
        stock = available;
        return this;
    }

    public ProductBuilder InCategory(string slugOfTheCategory)
    {
        categorySlug = slugOfTheCategory;
        return this;
    }

    public ProductBuilder AtCataloguePosition(int position)
    {
        catalogueOrder = position;
        return this;
    }

    public Product Build() => new(
        id,
        name,
        slug,
        "A description that no rule reads.",
        Money.Euro(priceInCents),
        categorySlug,
        stock,
        $"/images/products/{slug}.svg",
        catalogueOrder);
}
