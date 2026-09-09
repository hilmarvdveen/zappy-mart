using Zappy.Domain;

namespace Zappy.Application;

public sealed record Authentication(
    Customer Customer,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    string SessionId);
