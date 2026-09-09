using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class SessionRepository(ZappyDbContext database) : ISessionRepository
{
    public async Task Add(Session session, RefreshToken refreshToken, CancellationToken cancellationToken)
    {
        await database.Sessions.AddAsync(session, cancellationToken);
        await database.RefreshTokens.AddAsync(refreshToken, cancellationToken);
    }

    public async Task AddRefreshToken(RefreshToken refreshToken, CancellationToken cancellationToken) =>
        await database.RefreshTokens.AddAsync(refreshToken, cancellationToken);

    public async Task<int> NextCreationOrderFor(string customerId, CancellationToken cancellationToken)
    {
        var highest = await database.Sessions
            .Where(session => session.CustomerId == customerId)
            .Select(session => (int?)session.CreationOrder)
            .MaxAsync(cancellationToken);

        return (highest ?? 0) + 1;
    }

    public async Task<Session?> WithId(string sessionId, CancellationToken cancellationToken) =>
        await database.Sessions.SingleOrDefaultAsync(session => session.Id == sessionId, cancellationToken);

    public async Task<IReadOnlyList<Session>> OpenOfCustomer(
        string customerId,
        DateTimeOffset moment,
        CancellationToken cancellationToken) =>
        await database.Sessions
            .Where(session => session.CustomerId == customerId)
            .Where(session => session.RevokedAt == null)
            .Where(session => session.ExpiresAt > moment)
            .OrderByDescending(session => session.CreatedAt)
            .ThenByDescending(session => session.CreationOrder)
            .ToListAsync(cancellationToken);

    public async Task<RefreshToken?> WithTokenHash(string tokenHash, CancellationToken cancellationToken) =>
        await database.RefreshTokens.SingleOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);
}
