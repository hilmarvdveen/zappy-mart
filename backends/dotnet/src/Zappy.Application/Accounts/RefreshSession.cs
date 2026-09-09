using Zappy.Domain;

namespace Zappy.Application;

public sealed class RefreshSession(
    ISessionRepository sessions,
    ICustomerRepository customers,
    ITokenIssuer tokenIssuer,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<Result<Authentication>> Execute(string? presentedRefreshToken, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                if (string.IsNullOrWhiteSpace(presentedRefreshToken))
                {
                    return Unusable();
                }

                var now = clock.Now;
                var stored = await sessions.WithTokenHash(tokenIssuer.HashRefreshToken(presentedRefreshToken), token);
                if (stored is null)
                {
                    return Unusable();
                }

                var session = await sessions.WithId(stored.SessionId, token);
                if (session is null)
                {
                    return Unusable();
                }

                if (stored.WasAlreadyUsed)
                {
                    session.Revoke(now);
                    return Unusable();
                }

                if (stored.HasExpiredAt(now) || !session.IsOpenAt(now))
                {
                    return Unusable();
                }

                var customer = await customers.WithId(session.CustomerId, token);
                if (customer is null)
                {
                    return Unusable();
                }

                stored.Rotate(now);
                session.RecordUse(now);

                var replacement = tokenIssuer.IssueRefreshToken();
                await sessions.AddRefreshToken(
                    new RefreshToken(
                        Identifier.New(),
                        session.Id,
                        tokenIssuer.HashRefreshToken(replacement),
                        now,
                        session.ExpiresAt),
                    token);

                var accessToken = tokenIssuer.IssueAccessToken(customer.Id, session.Id, now);
                return Result<Authentication>.Success(new Authentication(
                    customer,
                    accessToken.Value,
                    accessToken.ExpiresAt,
                    replacement,
                    session.ExpiresAt,
                    session.Id));
            },
            cancellationToken);

    private static Result<Authentication> Unusable() =>
        Result<Authentication>.Failure(
            UserErrorCode.SessionInvalid,
            "The refresh token is unknown, expired or was already used.");
}
