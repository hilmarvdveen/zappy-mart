namespace Zappy.Domain;

public sealed class Customer
{
    private Customer()
    {
    }

    public Customer(string id, EmailAddress email, string name, string passwordHash, DateTimeOffset createdAt)
    {
        Id = id;
        Email = email;
        Name = name;
        PasswordHash = passwordHash;
        CreatedAt = createdAt;
    }

    public string Id { get; private set; } = null!;

    public EmailAddress Email { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string PasswordHash { get; private set; } = null!;

    public DateTimeOffset CreatedAt { get; private set; }
}
