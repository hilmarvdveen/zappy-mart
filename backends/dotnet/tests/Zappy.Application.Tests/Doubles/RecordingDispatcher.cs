using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class RecordingDispatcher : IDomainEventDispatcher
{
    public List<DomainEvent> Dispatched { get; } = [];

    public Task Dispatch(IReadOnlyList<DomainEvent> raisedEvents, CancellationToken cancellationToken)
    {
        Dispatched.AddRange(raisedEvents);
        return Task.CompletedTask;
    }
}
