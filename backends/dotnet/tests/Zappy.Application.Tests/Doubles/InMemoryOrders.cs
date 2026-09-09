using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryOrders : IOrderRepository
{
    public List<Order> Orders { get; } = [];

    public Task Add(Order order, CancellationToken cancellationToken)
    {
        Orders.Add(order);
        return Task.CompletedTask;
    }

    public Task<Page<Order>> OfCustomer(
        string customerId,
        int first,
        string? afterOrderId,
        CancellationToken cancellationToken)
    {
        var newestFirst = Orders
            .Where(order => order.CustomerId == customerId)
            .OrderByDescending(order => order.PlacedAt)
            .ToList();

        var start = afterOrderId is null ? 0 : newestFirst.FindIndex(order => order.Id == afterOrderId) + 1;
        var page = newestFirst.Skip(start).Take(first).ToList();
        return Task.FromResult(new Page<Order>(page, start + page.Count < newestFirst.Count, newestFirst.Count));
    }

    public Task<Order?> OfCustomerWithId(string customerId, string orderId, CancellationToken cancellationToken) =>
        Task.FromResult(Orders.SingleOrDefault(order => order.CustomerId == customerId && order.Id == orderId));
}
