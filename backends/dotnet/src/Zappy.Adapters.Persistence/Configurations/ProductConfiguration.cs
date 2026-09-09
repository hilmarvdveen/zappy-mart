using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(product => product.Id);
        builder.Property(product => product.Id).HasMaxLength(64);
        builder.Property(product => product.Name).HasMaxLength(240).IsRequired();
        builder.Property(product => product.Slug).HasMaxLength(240).IsRequired();
        builder.Property(product => product.Description).IsRequired();
        builder.Property(product => product.CategorySlug).HasMaxLength(120).IsRequired();
        builder.Property(product => product.ImageUrl).HasMaxLength(400);
        builder.HasIndex(product => product.Slug).IsUnique();

        builder.ComplexProperty(product => product.Price, price =>
        {
            price.Property(money => money.Amount).HasColumnName("PriceAmount");
            price.Property(money => money.Currency).HasColumnName("PriceCurrency").HasMaxLength(3);
        });

        builder
            .HasOne(product => product.Category)
            .WithMany()
            .HasForeignKey(product => product.CategorySlug)
            .HasPrincipalKey(category => category.Slug)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
