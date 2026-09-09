using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CartLineConfiguration : IEntityTypeConfiguration<CartLine>
{
    public void Configure(EntityTypeBuilder<CartLine> builder)
    {
        builder.HasKey(line => line.Id);
        builder.Property(line => line.Id).HasMaxLength(64);
        builder.Property(line => line.CartId).HasMaxLength(64);
        builder.Property(line => line.ProductId).HasMaxLength(64);
        builder.HasIndex(line => new { line.CartId, line.ProductId }).IsUnique();

        builder
            .HasOne(line => line.Product)
            .WithMany()
            .HasForeignKey(line => line.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
