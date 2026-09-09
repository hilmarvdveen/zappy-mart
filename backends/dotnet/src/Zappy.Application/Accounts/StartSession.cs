using Zappy.Domain;

namespace Zappy.Application;

public sealed class StartSession(ISessionRepository sessions, ITokenIssuer tokenIssuer, IClock clock)
{
    public async Task<Authentication> Execute(Customer customer, string device, CancellationToken cancellationToken)
    {
        var now = clock.Now;
        var session = new Session(
            Identifier.New(),
            customer.Id,
            device,
            await sessions.NextCreationOrderFor(customer.Id, cancellationToken),
            now,
            now.Add(SessionLifetime.RefreshToken));
        var refreshToken = tokenIssuer.IssueRefreshToken();
        var storedToken = new RefreshToken(
            Identifier.New(),
            session.Id,
            tokenIssuer.HashRefreshToken(refreshToken),
            now,
            session.ExpiresAt);

        await sessions.Add(session, storedToken, cancellationToken);

        var accessToken = tokenIssuer.IssueAccessToken(customer.Id, session.Id, now);
        return new Authentication(
            customer,
            accessToken.Value,
            accessToken.ExpiresAt,
            refreshToken,
            session.ExpiresAt,
            session.Id);
    }
}
