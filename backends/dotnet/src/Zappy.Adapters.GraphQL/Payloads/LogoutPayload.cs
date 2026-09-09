using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class LogoutPayload(bool success, IReadOnlyList<UserError> errors)
{
    public bool Success { get; } = success;

    public IReadOnlyList<UserError> Errors { get; } = errors;
}
