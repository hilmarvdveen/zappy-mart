namespace Zappy.Adapters.Security;

public sealed class SecuritySettings
{
    public const string Section = "Security";

    public string Issuer { get; set; } = "https://zappy-mart.localhost";

    public string Audience { get; set; } = "zappy-mart";

    public string? PrivateKeyPem { get; set; }

    public int Argon2MemoryKibibytes { get; set; } = 19456;

    public int Argon2Iterations { get; set; } = 2;

    public int Argon2Parallelism { get; set; } = 1;

    public int LoginAttemptsAllowed { get; set; } = 20;

    public int LoginAttemptWindowMinutes { get; set; } = 5;
}
