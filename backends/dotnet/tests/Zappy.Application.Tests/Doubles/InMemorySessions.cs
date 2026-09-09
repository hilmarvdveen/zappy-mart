using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemorySessions : ISessionRepository
{
    public List<Session> Sessions { get; } = [];

    public List<RefreshToken> RefreshTokens { get; } = [];

    public Task Add(Session session, RefreshToken refreshToken, CancellationToken cancellationToken)
    {
        Sessions.Add(session);
        RefreshTokens.Add(refreshToken);
        return Task.CompletedTask;
    }

    public Task AddRefreshToken(RefreshToken refreshToken, CancellationToken cancellationToken)
    {
        RefreshTokens.Add(refreshToken);
        return Task.CompletedTask;
    }

    public Task<int> NextCreationOrderFor(string customerId, CancellationToken cancellationToken) =>
        Task.FromResult(Sessions.Count(session => session.CustomerId == customerId) + 1);

    public Task<Session?> WithId(string sessionId, CancellationToken cancellationToken) =>
        Task.FromResult(Sessions.SingleOrDefault(session => session.Id == sessionId));

    public Task<IReadOnlyList<Session>> OpenOfCustomer(
        string customerId,
        DateTimeOffset moment,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Session>>(
        [
            .. Sessions
                .Where(session => session.CustomerId == customerId && session.IsOpenAt(moment))
                .OrderByDescending(session => session.CreatedAt)
                .ThenByDescending(session => session.CreationOrder)
        ]);

    public Task<RefreshToken?> WithTokenHash(string tokenHash, CancellationToken cancellationToken) =>
        Task.FromResult(RefreshTokens.SingleOrDefault(token => token.TokenHash == tokenHash));
}
