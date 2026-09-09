using Zappy.Domain;

namespace Zappy.Application;

public sealed class DomainEventDispatcher(IEnumerable<IDomainEventHandler<OrderPlaced>> orderPlacedHandlers)
    : IDomainEventDispatcher
{
    public async Task Dispatch(IReadOnlyList<DomainEvent> raisedEvents, CancellationToken cancellationToken)
    {
        foreach (var orderPlaced in raisedEvents.OfType<OrderPlaced>())
        {
            foreach (var handler in orderPlacedHandlers)
            {
                await handler.Handle(orderPlaced, cancellationToken);
            }
        }
    }
}
