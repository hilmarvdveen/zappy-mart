using Zappy.Domain;

namespace Zappy.Application;

public sealed class SendOrderConfirmation(
    IOrderRepository orders,
    ICustomerRepository customers,
    IMailer mailer) : IDomainEventHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced orderPlaced, CancellationToken cancellationToken)
    {
        var customer = await customers.WithId(orderPlaced.CustomerId, cancellationToken);
        if (customer is null)
        {
            return;
        }

        var order = await orders.OfCustomerWithId(orderPlaced.CustomerId, orderPlaced.OrderId, cancellationToken);
        if (order is null)
        {
            return;
        }

        await mailer.SendOrderConfirmation(customer.Email, customer.Name, order, cancellationToken);
    }
}
