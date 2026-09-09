using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(refreshToken => refreshToken.Id);
        builder.Property(refreshToken => refreshToken.Id).HasMaxLength(64);
        builder.Property(refreshToken => refreshToken.SessionId).HasMaxLength(64).IsRequired();
        builder.Property(refreshToken => refreshToken.TokenHash).HasMaxLength(128).IsRequired();
        builder.HasIndex(refreshToken => refreshToken.TokenHash).IsUnique();

        builder
            .HasOne<Session>()
            .WithMany()
            .HasForeignKey(refreshToken => refreshToken.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
