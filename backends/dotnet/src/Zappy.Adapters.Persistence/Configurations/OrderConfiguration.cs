using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(order => order.Id);
        builder.Property(order => order.Id).HasMaxLength(64);
        builder.Property(order => order.Number).HasMaxLength(64).IsRequired();
        builder.Property(order => order.CustomerId).HasMaxLength(64).IsRequired();
        builder.Property(order => order.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(order => order.PromotionCode).HasMaxLength(64);
        builder.HasIndex(order => order.Number).IsUnique();
        builder.HasIndex(order => new { order.CustomerId, order.PlacedAt });

        builder.Ignore(order => order.RaisedEvents);

        MoneyColumns(builder, order => order.Subtotal, "Subtotal");
        MoneyColumns(builder, order => order.Discount, "Discount");
        MoneyColumns(builder, order => order.Shipping, "Shipping");
        MoneyColumns(builder, order => order.Total, "Total");

        builder.HasMany(order => order.Lines).WithOne().HasForeignKey(line => line.OrderId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void MoneyColumns(
        EntityTypeBuilder<Order> builder,
        System.Linq.Expressions.Expression<Func<Order, Money?>> amount,
        string columnPrefix)
    {
        builder.ComplexProperty(amount, money =>
        {
            money.Property(value => value.Amount).HasColumnName($"{columnPrefix}Amount");
            money.Property(value => value.Currency).HasColumnName($"{columnPrefix}Currency").HasMaxLength(3);
        });
    }
}
