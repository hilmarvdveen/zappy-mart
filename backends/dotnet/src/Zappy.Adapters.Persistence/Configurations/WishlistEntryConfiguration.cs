using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class WishlistEntryConfiguration : IEntityTypeConfiguration<WishlistEntry>
{
    public void Configure(EntityTypeBuilder<WishlistEntry> builder)
    {
        builder.HasKey(entry => new { entry.OwnerId, entry.ProductId });
        builder.Property(entry => entry.OwnerId).HasMaxLength(64);
        builder.Property(entry => entry.ProductId).HasMaxLength(64);

        builder
            .HasOne<Product>()
            .WithMany()
            .HasForeignKey(entry => entry.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
