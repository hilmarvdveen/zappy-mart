using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CartConfiguration : IEntityTypeConfiguration<Cart>
{
    public void Configure(EntityTypeBuilder<Cart> builder)
    {
        builder.HasKey(cart => cart.Id);
        builder.Property(cart => cart.Id).HasMaxLength(64);
        builder.Property(cart => cart.CustomerId).HasMaxLength(64);
        builder.Property(cart => cart.AppliedPromotionCodeText).HasMaxLength(64);
        builder.HasIndex(cart => cart.CustomerId);

        builder.HasMany(cart => cart.Lines).WithOne().HasForeignKey(line => line.CartId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(cart => cart.Lines).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder
            .HasOne(cart => cart.AppliedPromotionCode)
            .WithMany()
            .HasForeignKey(cart => cart.AppliedPromotionCodeText)
            .HasPrincipalKey(promotionCode => promotionCode.Code)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
