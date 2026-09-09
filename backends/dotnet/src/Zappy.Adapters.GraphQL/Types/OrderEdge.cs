using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderEdge(string cursor, Order node)
{
    public string Cursor { get; } = cursor;

    public Order Node { get; } = node;
}
