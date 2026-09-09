using Zappy.Domain;

namespace Zappy.Application;

public interface ICartRepository
{
    Task<Cart?> WithId(string id, CancellationToken cancellationToken);

    Task<Cart?> OfCustomer(string customerId, CancellationToken cancellationToken);

    Task Add(Cart cart, CancellationToken cancellationToken);

    Task Remove(Cart cart, CancellationToken cancellationToken);
}
