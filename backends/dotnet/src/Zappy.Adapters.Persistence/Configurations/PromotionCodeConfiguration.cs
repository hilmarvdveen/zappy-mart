using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class PromotionCodeConfiguration : IEntityTypeConfiguration<PromotionCode>
{
    public void Configure(EntityTypeBuilder<PromotionCode> builder)
    {
        builder.HasKey(promotionCode => promotionCode.Code);
        builder.Property(promotionCode => promotionCode.Code).HasMaxLength(64);
        builder.Property(promotionCode => promotionCode.Kind).HasConversion<string>().HasMaxLength(32);

        builder.ComplexProperty(promotionCode => promotionCode.Amount, amount =>
        {
            amount.Property(money => money.Amount).HasColumnName("AmountValue");
            amount.Property(money => money.Currency).HasColumnName("AmountCurrency").HasMaxLength(3);
        });

        builder.ComplexProperty(promotionCode => promotionCode.MinimumSubtotal, minimum =>
        {
            minimum.Property(money => money.Amount).HasColumnName("MinimumSubtotalValue");
            minimum.Property(money => money.Currency).HasColumnName("MinimumSubtotalCurrency").HasMaxLength(3);
        });
    }
}
