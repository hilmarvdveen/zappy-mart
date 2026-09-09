namespace Zappy.Application;

public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);
