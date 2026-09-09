using Zappy.Domain;

namespace Zappy.Application;

public interface IDomainEventDispatcher
{
    Task Dispatch(IReadOnlyList<DomainEvent> raisedEvents, CancellationToken cancellationToken);
}
