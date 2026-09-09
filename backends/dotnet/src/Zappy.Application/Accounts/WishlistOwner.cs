namespace Zappy.Application;

public sealed class WishlistOwner(VisitorCart visitorCart)
{
    public async Task<string?> Find(Visitor visitor, CancellationToken cancellationToken) =>
        visitor.CustomerId ?? (await visitorCart.Find(visitor, cancellationToken))?.Id;

    public async Task<string> FindOrStartOne(Visitor visitor, CancellationToken cancellationToken) =>
        visitor.CustomerId ?? (await visitorCart.FindOrStartOne(visitor, cancellationToken)).Id;
}
