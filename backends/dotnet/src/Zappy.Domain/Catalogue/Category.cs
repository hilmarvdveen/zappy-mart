namespace Zappy.Domain;

public sealed class Category
{
    private Category()
    {
    }

    public Category(string id, string name, string slug, int catalogueOrder)
    {
        Id = id;
        Name = name;
        Slug = slug;
        CatalogueOrder = catalogueOrder;
    }

    public string Id { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string Slug { get; private set; } = null!;

    public int CatalogueOrder { get; private set; }
}
