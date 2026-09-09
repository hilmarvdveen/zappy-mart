namespace Zappy.Domain;

public sealed class RefreshToken
{
    private RefreshToken()
    {
    }

    public RefreshToken(string id, string sessionId, string tokenHash, DateTimeOffset createdAt, DateTimeOffset expiresAt)
    {
        Id = id;
        SessionId = sessionId;
        TokenHash = tokenHash;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public string Id { get; private set; } = null!;

    public string SessionId { get; private set; } = null!;

    public string TokenHash { get; private set; } = null!;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RotatedAt { get; private set; }

    public bool WasAlreadyUsed => RotatedAt is not null;

    public bool HasExpiredAt(DateTimeOffset moment) => moment >= ExpiresAt;

    public void Rotate(DateTimeOffset moment) => RotatedAt = moment;
}
