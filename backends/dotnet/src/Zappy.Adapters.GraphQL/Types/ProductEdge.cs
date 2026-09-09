using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductEdge(string cursor, Product node)
{
    public string Cursor { get; } = cursor;

    public Product Node { get; } = node;
}
