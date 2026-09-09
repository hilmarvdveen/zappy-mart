using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.HasKey(customer => customer.Id);
        builder.Property(customer => customer.Id).HasMaxLength(64);
        builder.Property(customer => customer.Name).HasMaxLength(240).IsRequired();
        builder.Property(customer => customer.PasswordHash).HasMaxLength(512).IsRequired();
        builder
            .Property(customer => customer.Email)
            .HasConversion(email => email.Value, value => EmailAddress.Create(value)!)
            .HasMaxLength(320)
            .IsRequired();
        builder.HasIndex(customer => customer.Email).IsUnique();
    }
}
