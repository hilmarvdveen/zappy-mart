using Zappy.Domain;

namespace Zappy.Application;

public interface ISessionRepository
{
    Task Add(Session session, RefreshToken refreshToken, CancellationToken cancellationToken);

    Task AddRefreshToken(RefreshToken refreshToken, CancellationToken cancellationToken);

    Task<int> NextCreationOrderFor(string customerId, CancellationToken cancellationToken);

    Task<Session?> WithId(string sessionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Session>> OpenOfCustomer(
        string customerId,
        DateTimeOffset moment,
        CancellationToken cancellationToken);

    Task<RefreshToken?> WithTokenHash(string tokenHash, CancellationToken cancellationToken);
}
