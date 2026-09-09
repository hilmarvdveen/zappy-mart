using Zappy.Domain;

namespace Zappy.Application;

public sealed class MergeAnonymousCart(ICartRepository carts, IClock clock)
{
    public async Task Execute(Customer customer, Visitor visitor, CancellationToken cancellationToken)
    {
        if (visitor.AnonymousCartId is null)
        {
            return;
        }

        var anonymousCart = await carts.WithId(visitor.AnonymousCartId, cancellationToken);
        if (anonymousCart is null || anonymousCart.CustomerId is not null)
        {
            return;
        }

        var customerCart = await carts.OfCustomer(customer.Id, cancellationToken);
        if (customerCart is null)
        {
            anonymousCart.BelongsTo(customer.Id, clock.Now);
            return;
        }

        customerCart.TakeOver(anonymousCart, clock.Now);
        await carts.Remove(anonymousCart, cancellationToken);
    }
}
