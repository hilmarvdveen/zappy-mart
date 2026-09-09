using Zappy.Domain;

namespace Zappy.Application;

public sealed class RevokeSession(ISessionRepository sessions, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<Result<IReadOnlyList<Session>>> Execute(
        Visitor visitor,
        string sessionId,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                if (visitor.CustomerId is null)
                {
                    return Result<IReadOnlyList<Session>>.Refused(
                        [],
                        UserErrorCode.NotAuthenticated,
                        "This operation needs a signed in customer.");
                }

                var now = clock.Now;
                var session = await sessions.WithId(sessionId, token);
                if (session is null || session.CustomerId != visitor.CustomerId)
                {
                    return Result<IReadOnlyList<Session>>.Refused(
                        await sessions.OpenOfCustomer(visitor.CustomerId, now, token),
                        UserErrorCode.SessionNotFound,
                        "No session with that id belongs to the signed in customer.",
                        "sessionId");
                }

                session.Revoke(now);
                var stillOpen = await sessions.OpenOfCustomer(visitor.CustomerId, now, token);
                return Result<IReadOnlyList<Session>>.Success(
                    [.. stillOpen.Where(candidate => candidate.IsOpenAt(now))]);
            },
            cancellationToken);
}
