using Zappy.Domain;

namespace Zappy.Application;

public sealed class PlaceOrder(
    VisitorCart visitorCart,
    IOrderRepository orders,
    IDomainEventDispatcher dispatcher,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<Result<Order>> Execute(
        Visitor visitor,
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        var placed = await unitOfWork.RunInOneTransaction(
            async token =>
            {
                if (visitor.CustomerId is null)
                {
                    return Result<Order>.Failure(
                        UserErrorCode.NotAuthenticated,
                        "This operation needs a signed in customer.");
                }

                var cart = await visitorCart.Find(visitor, token);
                if (cart is null || cart.IsEmpty)
                {
                    return Result<Order>.Failure(
                        UserErrorCode.CartEmpty,
                        "The cart has no lines, so there is nothing to order.");
                }

                var order = Order.Place(cart, visitor.CustomerId, clock.Now);
                if (order.Value is not null)
                {
                    await orders.Add(order.Value, token);
                }

                return order;
            },
            cancellationToken);

        if (placed.Value is not null)
        {
            await dispatcher.Dispatch(placed.Value.RaisedEvents, cancellationToken);
            placed.Value.ForgetRaisedEvents();
        }

        return placed;
    }
}
