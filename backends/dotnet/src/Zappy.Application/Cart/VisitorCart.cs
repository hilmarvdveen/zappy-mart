using Zappy.Domain;

namespace Zappy.Application;

public sealed class VisitorCart(ICartRepository carts, IClock clock)
{
    public async Task<Cart?> Find(Visitor visitor, CancellationToken cancellationToken)
    {
        if (visitor.CustomerId is not null)
        {
            return await carts.OfCustomer(visitor.CustomerId, cancellationToken);
        }

        if (visitor.AnonymousCartId is null)
        {
            return null;
        }

        var anonymousCart = await carts.WithId(visitor.AnonymousCartId, cancellationToken);
        return anonymousCart?.CustomerId is null ? anonymousCart : null;
    }

    public async Task<Cart> FindOrStartOne(Visitor visitor, CancellationToken cancellationToken)
    {
        var found = await Find(visitor, cancellationToken);
        if (found is not null)
        {
            return found;
        }

        var started = new Cart(Identifier.New(), visitor.CustomerId, clock.Now);
        await carts.Add(started, cancellationToken);
        return started;
    }

    public Cart EmptyOne(Visitor visitor) => new(Identifier.New(), visitor.CustomerId, clock.Now);
}
