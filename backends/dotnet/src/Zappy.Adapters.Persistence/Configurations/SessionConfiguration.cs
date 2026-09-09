using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.HasKey(session => session.Id);
        builder.Property(session => session.Id).HasMaxLength(64);
        builder.Property(session => session.CustomerId).HasMaxLength(64).IsRequired();
        builder.Property(session => session.Device).HasMaxLength(240).IsRequired();
        builder.HasIndex(session => new { session.CustomerId, session.CreationOrder });

        builder
            .HasOne<Customer>()
            .WithMany()
            .HasForeignKey(session => session.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
