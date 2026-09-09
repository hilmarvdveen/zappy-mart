using Zappy.Domain;

namespace Zappy.Application;

public sealed class LogOut(ISessionRepository sessions, ITokenIssuer tokenIssuer, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<bool> Execute(Visitor visitor, string? presentedRefreshToken, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var session = await SessionOfTheRequest(visitor, presentedRefreshToken, token);
                session?.Revoke(clock.Now);
                return true;
            },
            cancellationToken);

    private async Task<Session?> SessionOfTheRequest(
        Visitor visitor,
        string? presentedRefreshToken,
        CancellationToken cancellationToken)
    {
        if (visitor.SessionId is not null)
        {
            return await sessions.WithId(visitor.SessionId, cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(presentedRefreshToken))
        {
            return null;
        }

        var stored = await sessions.WithTokenHash(tokenIssuer.HashRefreshToken(presentedRefreshToken), cancellationToken);
        return stored is null ? null : await sessions.WithId(stored.SessionId, cancellationToken);
    }
}
