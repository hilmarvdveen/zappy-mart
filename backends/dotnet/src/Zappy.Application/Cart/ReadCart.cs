using Zappy.Domain;

namespace Zappy.Application;

public sealed class ReadCart(VisitorCart visitorCart)
{
    public async Task<Cart> Execute(Visitor visitor, CancellationToken cancellationToken) =>
        await visitorCart.Find(visitor, cancellationToken) ?? visitorCart.EmptyOne(visitor);
}
