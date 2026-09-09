using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class AuthenticationPayload(
    Customer? customer,
    string? accessToken,
    DateTimeOffset? accessTokenExpiresAt,
    IReadOnlyList<UserError> errors)
{
    public Customer? Customer { get; } = customer;

    public string? AccessToken { get; } = accessToken;

    public DateTimeOffset? AccessTokenExpiresAt { get; } = accessTokenExpiresAt;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static AuthenticationPayload From(Zappy.Domain.Result<Authentication> result) =>
        result.Value is null
            ? new AuthenticationPayload(null, null, null, result.Errors)
            : new AuthenticationPayload(
                result.Value.Customer,
                result.Value.AccessToken,
                result.Value.AccessTokenExpiresAt,
                result.Errors);
}
