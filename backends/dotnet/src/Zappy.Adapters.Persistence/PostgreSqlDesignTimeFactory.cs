using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Zappy.Adapters.Persistence;

public sealed class PostgreSqlDesignTimeFactory : IDesignTimeDbContextFactory<PostgreSqlZappyDbContext>
{
    public PostgreSqlZappyDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<PostgreSqlZappyDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=zappy;Username=zappy;Password=zappy")
            .Options);
}
