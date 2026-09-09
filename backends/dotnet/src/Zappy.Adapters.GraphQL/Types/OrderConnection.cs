using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderConnection(IReadOnlyList<OrderEdge> edges, PageInfo pageInfo, int totalCount)
{
    public IReadOnlyList<OrderEdge> Edges { get; } = edges;

    public PageInfo PageInfo { get; } = pageInfo;

    public int TotalCount { get; } = totalCount;

    public static OrderConnection From(Page<Order> page)
    {
        var edges = page.Items.Select(order => new OrderEdge(Cursor.For(order.Id), order)).ToList();
        return new OrderConnection(
            edges,
            new PageInfo(page.HasNextPage, edges.Count == 0 ? null : edges[^1].Cursor),
            page.TotalCount);
    }
}
