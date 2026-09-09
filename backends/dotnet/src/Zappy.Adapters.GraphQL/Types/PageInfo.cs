namespace Zappy.Adapters.GraphQL;

public sealed class PageInfo(bool hasNextPage, string? endCursor)
{
    public bool HasNextPage { get; } = hasNextPage;

    public string? EndCursor { get; } = endCursor;
}
