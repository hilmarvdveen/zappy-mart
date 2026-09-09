using Zappy.Domain;

namespace Zappy.Application;

public interface IOrderRepository
{
    Task Add(Order order, CancellationToken cancellationToken);

    Task<Page<Order>> OfCustomer(
        string customerId,
        int first,
        string? afterOrderId,
        CancellationToken cancellationToken);

    Task<Order?> OfCustomerWithId(string customerId, string orderId, CancellationToken cancellationToken);
}
