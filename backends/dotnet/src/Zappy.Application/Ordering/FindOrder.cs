using Zappy.Domain;

namespace Zappy.Application;

public sealed class FindOrder(IOrderRepository orders)
{
    public async Task<Order?> Execute(Visitor visitor, string orderId, CancellationToken cancellationToken) =>
        visitor.CustomerId is null
            ? null
            : await orders.OfCustomerWithId(visitor.CustomerId, orderId, cancellationToken);
}
