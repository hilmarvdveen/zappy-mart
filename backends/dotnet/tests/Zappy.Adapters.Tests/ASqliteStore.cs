using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Zappy.Adapters.Persistence;
using Zappy.Adapters.Security;
using Zappy.Application;

namespace Zappy.Adapters.Tests;

public sealed class ASqliteStore : IDisposable
{
    private readonly string databaseFile = Path.Combine(
        Path.GetTempPath(),
        $"zappy-mart-store-{Guid.CreateVersion7():n}.db");

    public ASqliteStore()
    {
        Database = new SqliteZappyDbContext(new DbContextOptionsBuilder<SqliteZappyDbContext>()
            .UseSqlite($"Data Source={databaseFile}")
            .Options);

        Database.Database.Migrate();
    }

    public SqliteZappyDbContext Database { get; }

    public SecuritySettings Settings { get; } = new() { Argon2MemoryKibibytes = 1024 };

    public IPasswordHasher PasswordHasher => new Argon2idPasswordHasher(Settings);

    public ITokenIssuer TokenIssuer => new JwtTokenIssuer(new SigningKeys(Settings), Settings);

    public ProductCatalogueVersion CatalogueVersion { get; } = new();

    public async Task<int> LoadTheSeed()
    {
        var loader = new SeedLoader(Database, PasswordHasher, CatalogueVersion, new SeedSettings());
        var loaded = await loader.LoadFreshSeed(TestContext.Current.CancellationToken);
        Database.ChangeTracker.Clear();
        return loaded;
    }

    public void Dispose()
    {
        Database.Dispose();
        SqliteConnection.ClearAllPools();

        if (File.Exists(databaseFile))
        {
            File.Delete(databaseFile);
        }
    }
}
