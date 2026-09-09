using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Zappy.Application;

namespace Zappy.Adapters.Persistence;

public static class PersistenceServices
{
    public static IServiceCollection AddZappyPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var database = new DatabaseSettings();
        configuration.GetSection(DatabaseSettings.Section).Bind(database);

        var seed = new SeedSettings();
        configuration.GetSection(SeedSettings.Section).Bind(seed);

        services.AddSingleton(database);
        services.AddSingleton(seed);
        services.AddSingleton<ProductCatalogueVersion>();
        services.AddMemoryCache();

        if (database.RunsOnPostgreSql)
        {
            services.AddDbContext<ZappyDbContext, PostgreSqlZappyDbContext>(
                options => options.UseNpgsql(database.ConnectionString));
        }
        else
        {
            services.AddDbContext<ZappyDbContext, SqliteZappyDbContext>(
                options => options.UseSqlite(database.ConnectionString));
        }

        services.AddScoped<ProductRepository>();
        services.AddScoped<IProductRepository>(provider => new CachedProductRepository(
            provider.GetRequiredService<ProductRepository>(),
            provider.GetRequiredService<IMemoryCache>(),
            provider.GetRequiredService<ProductCatalogueVersion>()));

        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICartRepository, CartRepository>();
        services.AddScoped<IPromotionCodeRepository, PromotionCodeRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IWishlistRepository, WishlistRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ISeedLoader, SeedLoader>();

        return services;
    }
}
