using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListOrders(IOrderRepository orders)
{
    public const int DefaultPageSize = 10;

    public async Task<Page<Order>> Execute(
        Visitor visitor,
        int? first,
        string? after,
        CancellationToken cancellationToken) =>
        visitor.CustomerId is null
            ? Page<Order>.Empty
            : await orders.OfCustomer(
                visitor.CustomerId,
                PageSize.Clamp(first, DefaultPageSize),
                Cursor.IdentifierIn(after),
                cancellationToken);
}
