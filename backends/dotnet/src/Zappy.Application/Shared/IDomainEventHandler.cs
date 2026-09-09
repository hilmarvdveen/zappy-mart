using Zappy.Domain;

namespace Zappy.Application;

public interface IDomainEventHandler<in TDomainEvent>
    where TDomainEvent : DomainEvent
{
    Task Handle(TDomainEvent domainEvent, CancellationToken cancellationToken);
}
