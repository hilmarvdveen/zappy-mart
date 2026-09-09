using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class OrderRepository(ZappyDbContext database) : IOrderRepository
{
    public async Task Add(Order order, CancellationToken cancellationToken) =>
        await database.Orders.AddAsync(order, cancellationToken);

    public async Task<Page<Order>> OfCustomer(
        string customerId,
        int first,
        string? afterOrderId,
        CancellationToken cancellationToken)
    {
        var newestFirst = WithLines()
            .Where(order => order.CustomerId == customerId)
            .OrderByDescending(order => order.PlacedAt)
            .ThenByDescending(order => order.Id);

        var totalCount = await database.Orders.CountAsync(order => order.CustomerId == customerId, cancellationToken);

        IQueryable<Order> matching = newestFirst;
        if (afterOrderId is not null)
        {
            var startAfter = await database.Orders
                .AsNoTracking()
                .Where(order => order.Id == afterOrderId)
                .Select(order => (DateTimeOffset?)order.PlacedAt)
                .SingleOrDefaultAsync(cancellationToken);

            if (startAfter is not null)
            {
                matching = matching.Where(order => order.PlacedAt < startAfter);
            }
        }

        var page = await matching.Take(first + 1).ToListAsync(cancellationToken);
        return new Page<Order>([.. page.Take(first)], page.Count > first, totalCount);
    }

    public async Task<Order?> OfCustomerWithId(string customerId, string orderId, CancellationToken cancellationToken) =>
        await WithLines().SingleOrDefaultAsync(
            order => order.Id == orderId && order.CustomerId == customerId,
            cancellationToken);

    private IQueryable<Order> WithLines() => database.Orders.AsNoTracking().Include(order => order.Lines);
}
