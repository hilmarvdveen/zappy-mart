namespace Zappy.Domain;

public static class Identifier
{
    public static string New() => Guid.CreateVersion7().ToString("n");
}
