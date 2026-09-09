namespace Zappy.Adapters.Persistence;

public sealed class SeedSettings
{
    public const string Section = "Seed";

    public string? Directory { get; set; }

    public bool LoadAtStart { get; set; }
}
