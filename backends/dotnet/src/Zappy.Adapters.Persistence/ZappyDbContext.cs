using Microsoft.EntityFrameworkCore;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public abstract class ZappyDbContext(DbContextOptions options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<Cart> Carts => Set<Cart>();

    public DbSet<CartLine> CartLines => Set<CartLine>();

    public DbSet<PromotionCode> PromotionCodes => Set<PromotionCode>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<Session> Sessions => Set<Session>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<WishlistEntry> WishlistEntries => Set<WishlistEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ZappyDbContext).Assembly);
}
