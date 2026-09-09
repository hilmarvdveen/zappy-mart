namespace Zappy.Adapters.GraphQL;

public sealed class LoginInput
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string? Device { get; set; }
}
