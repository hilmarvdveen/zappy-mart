namespace Zappy.Domain;

public sealed record EmailAddress
{
    private EmailAddress(string value) => Value = value;

    public string Value { get; }

    public static EmailAddress? Create(string value)
    {
        var normalised = value.Trim().ToLowerInvariant();
        var separator = normalised.IndexOf('@');
        if (separator <= 0 || separator != normalised.LastIndexOf('@') || separator == normalised.Length - 1)
        {
            return null;
        }

        var domain = normalised[(separator + 1)..];
        var dot = domain.IndexOf('.');
        if (dot <= 0 || dot == domain.Length - 1 || normalised.Contains(' '))
        {
            return null;
        }

        return new EmailAddress(normalised);
    }

    public override string ToString() => Value;
}
