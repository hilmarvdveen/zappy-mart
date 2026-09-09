using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class RevokeSessionPayload(IReadOnlyList<Session> sessions, IReadOnlyList<UserError> errors)
{
    public IReadOnlyList<Session> Sessions { get; } = sessions;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static RevokeSessionPayload From(Zappy.Domain.Result<IReadOnlyList<Session>> result) =>
        new(result.Value ?? [], result.Errors);
}
