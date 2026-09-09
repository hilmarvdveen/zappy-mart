namespace Zappy.Adapters.GraphQL;

public sealed class ProductFilter
{
    public string? CategorySlug { get; set; }

    public string? NameContains { get; set; }

    public bool? InStockOnly { get; set; }
}
