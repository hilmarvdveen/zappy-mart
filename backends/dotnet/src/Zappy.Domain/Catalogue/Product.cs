namespace Zappy.Domain;

public sealed class Product
{
    private Product()
    {
    }

    public Product(
        string id,
        string name,
        string slug,
        string description,
        Money price,
        string categorySlug,
        int stock,
        string? imageUrl,
        int catalogueOrder)
    {
        Id = id;
        Name = name;
        Slug = slug;
        Description = description;
        Price = price;
        CategorySlug = categorySlug;
        Stock = stock;
        ImageUrl = imageUrl;
        CatalogueOrder = catalogueOrder;
    }

    public string Id { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string Slug { get; private set; } = null!;

    public string Description { get; private set; } = null!;

    public Money Price { get; private set; } = null!;

    public string CategorySlug { get; private set; } = null!;

    public Category Category { get; private set; } = null!;

    public int Stock { get; private set; }

    public string? ImageUrl { get; private set; }

    public int CatalogueOrder { get; private set; }

    public bool HasStockFor(int quantity) => Stock >= quantity;

    public void Reserve(int quantity)
    {
        if (!HasStockFor(quantity))
        {
            throw new InvalidOperationException($"{Name} has {Stock} in stock and {quantity} were asked for.");
        }

        Stock -= quantity;
    }
}
