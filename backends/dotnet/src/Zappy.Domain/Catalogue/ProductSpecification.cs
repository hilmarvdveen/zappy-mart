using System.Linq.Expressions;

namespace Zappy.Domain;

public sealed record ProductSpecification(string? CategorySlug, string? NameContains, bool InStockOnly)
{
    public static readonly ProductSpecification WholeCatalogue = new(null, null, false);

    public IReadOnlyList<Expression<Func<Product, bool>>> Parts()
    {
        var parts = new List<Expression<Func<Product, bool>>>();

        if (!string.IsNullOrWhiteSpace(CategorySlug))
        {
            var slug = CategorySlug;
            parts.Add(product => product.CategorySlug == slug);
        }

        if (!string.IsNullOrWhiteSpace(NameContains))
        {
            var text = NameContains.ToLowerInvariant();
            parts.Add(product => product.Name.ToLower().Contains(text));
        }

        if (InStockOnly)
        {
            parts.Add(product => product.Stock > 0);
        }

        return parts;
    }

    public bool IsSatisfiedBy(Product product) => Parts().All(part => part.Compile().Invoke(product));
}
