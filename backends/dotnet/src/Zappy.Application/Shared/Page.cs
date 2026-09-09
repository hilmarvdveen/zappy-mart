namespace Zappy.Application;

public sealed record Page<TItem>(IReadOnlyList<TItem> Items, bool HasNextPage, int TotalCount)
{
    public static Page<TItem> Empty { get; } = new([], false, 0);
}
