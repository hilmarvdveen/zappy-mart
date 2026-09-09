namespace Zappy.Domain;

public sealed class Session
{
    private Session()
    {
    }

    public Session(
        string id,
        string customerId,
        string device,
        int creationOrder,
        DateTimeOffset createdAt,
        DateTimeOffset expiresAt)
    {
        Id = id;
        CreationOrder = creationOrder;
        CustomerId = customerId;
        Device = device;
        CreatedAt = createdAt;
        LastUsedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public string Id { get; private set; } = null!;

    public string CustomerId { get; private set; } = null!;

    public string Device { get; private set; } = null!;

    public int CreationOrder { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset LastUsedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public bool IsOpenAt(DateTimeOffset moment) => RevokedAt is null && moment < ExpiresAt;

    public void Revoke(DateTimeOffset moment) => RevokedAt ??= moment;

    public void RecordUse(DateTimeOffset moment) => LastUsedAt = moment;
}
