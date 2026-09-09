namespace Zappy.Application;

public sealed record Visitor(string? CustomerId, string? SessionId, string? AnonymousCartId)
{
    public static readonly Visitor Anonymous = new(null, null, null);

    public bool IsSignedIn => CustomerId is not null;
}
