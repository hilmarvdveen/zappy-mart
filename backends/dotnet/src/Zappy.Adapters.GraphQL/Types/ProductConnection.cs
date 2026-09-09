using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductConnection(IReadOnlyList<ProductEdge> edges, PageInfo pageInfo, int totalCount)
{
    public IReadOnlyList<ProductEdge> Edges { get; } = edges;

    public PageInfo PageInfo { get; } = pageInfo;

    public int TotalCount { get; } = totalCount;

    public static ProductConnection From(Page<Product> page)
    {
        var edges = page.Items.Select(product => new ProductEdge(Cursor.For(product.Id), product)).ToList();
        return new ProductConnection(
            edges,
            new PageInfo(page.HasNextPage, edges.Count == 0 ? null : edges[^1].Cursor),
            page.TotalCount);
    }
}
