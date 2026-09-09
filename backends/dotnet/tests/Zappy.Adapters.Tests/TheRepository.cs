namespace Zappy.Adapters.Tests;

public static class TheRepository
{
    public static string Root
    {
        get
        {
            var folder = new DirectoryInfo(AppContext.BaseDirectory);
            while (folder is not null)
            {
                if (Directory.Exists(Path.Combine(folder.FullName, "contract", "seed")))
                {
                    return folder.FullName;
                }

                folder = folder.Parent;
            }

            throw new DirectoryNotFoundException("The repository root with contract/seed was not found.");
        }
    }
}
