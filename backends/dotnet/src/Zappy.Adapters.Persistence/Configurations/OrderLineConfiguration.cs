using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class OrderLineConfiguration : IEntityTypeConfiguration<OrderLine>
{
    public void Configure(EntityTypeBuilder<OrderLine> builder)
    {
        builder.HasKey(line => line.Id);
        builder.Property(line => line.Id).HasMaxLength(64);
        builder.Property(line => line.OrderId).HasMaxLength(64);
        builder.Property(line => line.ProductId).HasMaxLength(64).IsRequired();
        builder.Property(line => line.ProductName).HasMaxLength(240).IsRequired();

        builder.ComplexProperty(line => line.UnitPrice, price =>
        {
            price.Property(money => money.Amount).HasColumnName("UnitPriceAmount");
            price.Property(money => money.Currency).HasColumnName("UnitPriceCurrency").HasMaxLength(3);
        });
    }
}
