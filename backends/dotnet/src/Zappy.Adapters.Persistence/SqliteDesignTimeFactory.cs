using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Zappy.Adapters.Persistence;

public sealed class SqliteDesignTimeFactory : IDesignTimeDbContextFactory<SqliteZappyDbContext>
{
    public SqliteZappyDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<SqliteZappyDbContext>()
            .UseSqlite("Data Source=design-time.db")
            .Options);
}
