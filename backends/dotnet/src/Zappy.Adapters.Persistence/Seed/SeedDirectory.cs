namespace Zappy.Adapters.Persistence;

public static class SeedDirectory
{
    public static string Find(string? configured)
    {
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return Path.GetFullPath(configured);
        }

        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null)
        {
            var candidate = Path.Combine(folder.FullName, "contract", "seed");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            folder = folder.Parent;
        }

        throw new DirectoryNotFoundException(
            "The seed folder contract/seed was not found above the running assembly. Set Seed:Directory in configuration.");
    }
}
