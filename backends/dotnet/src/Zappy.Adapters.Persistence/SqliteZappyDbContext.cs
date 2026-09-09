using Microsoft.EntityFrameworkCore;

namespace Zappy.Adapters.Persistence;

public sealed class SqliteZappyDbContext(DbContextOptions<SqliteZappyDbContext> options) : ZappyDbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var moments = modelBuilder.Model
            .GetEntityTypes()
            .SelectMany(entity => entity.GetProperties())
            .Where(property => property.ClrType == typeof(DateTimeOffset)
                || property.ClrType == typeof(DateTimeOffset?));

        foreach (var moment in moments)
        {
            moment.SetValueConverter(new MomentAsTicks());
        }
    }
}
