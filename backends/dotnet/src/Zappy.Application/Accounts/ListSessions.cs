using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListSessions(ISessionRepository sessions, IClock clock)
{
    public async Task<IReadOnlyList<Session>> Execute(string customerId, CancellationToken cancellationToken) =>
        await sessions.OpenOfCustomer(customerId, clock.Now, cancellationToken);
}
