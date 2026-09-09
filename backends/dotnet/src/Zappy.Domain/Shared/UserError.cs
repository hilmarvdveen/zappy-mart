namespace Zappy.Domain;

public sealed record UserError(UserErrorCode Code, string Message, string? Field = null);
