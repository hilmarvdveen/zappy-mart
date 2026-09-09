using Microsoft.EntityFrameworkCore;
using Zappy.Adapters.Persistence;
using Zappy.Application;

namespace Zappy.Host;

public static class StorePreparation
{
    public static async Task PrepareTheStore(this WebApplication application)
    {
        using var scope = application.Services.CreateScope();
        var services = scope.ServiceProvider;

        await services.GetRequiredService<ZappyDbContext>().Database.MigrateAsync();

        if (services.GetRequiredService<SeedSettings>().LoadAtStart)
        {
            await services.GetRequiredService<ISeedLoader>().LoadFreshSeed(CancellationToken.None);
        }
    }
}
