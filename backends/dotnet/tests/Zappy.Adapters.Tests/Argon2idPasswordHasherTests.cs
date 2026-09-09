using Zappy.Adapters.Security;

namespace Zappy.Adapters.Tests;

public sealed class Argon2idPasswordHasherTests
{
    private readonly SecuritySettings settings = new() { Argon2MemoryKibibytes = 1024 };

    [Fact]
    public void AHashCarriesTheParametersItWasMadeWith()
    {
        var hash = new Argon2idPasswordHasher(settings).Hash("correct horse battery staple");

        Assert.StartsWith("$argon2id$v=19$m=1024,t=2,p=1$", hash, StringComparison.Ordinal);
    }

    [Fact]
    public void ThePasswordItselfIsNowhereInTheHash()
    {
        var hash = new Argon2idPasswordHasher(settings).Hash("correct horse battery staple");

        Assert.DoesNotContain("correct horse battery staple", hash, StringComparison.Ordinal);
    }

    [Fact]
    public void TheSamePasswordHashesDifferentlyEveryTime()
    {
        var hasher = new Argon2idPasswordHasher(settings);

        Assert.NotEqual(hasher.Hash("correct horse battery staple"), hasher.Hash("correct horse battery staple"));
    }

    [Fact]
    public void AHashMatchesItsOwnPasswordAndNoOther()
    {
        var hasher = new Argon2idPasswordHasher(settings);
        var hash = hasher.Hash("correct horse battery staple");

        Assert.True(hasher.Matches("correct horse battery staple", hash));
        Assert.False(hasher.Matches("correct horse battery stapler", hash));
    }

    [Fact]
    public void AHashOfAnotherShapeIsRefusedRatherThanThrown()
    {
        var hasher = new Argon2idPasswordHasher(settings);

        Assert.False(hasher.Matches("correct horse battery staple", "not a hash at all"));
    }

    [Fact]
    public void AHashMadeWithOtherParametersStillVerifies()
    {
        var hash = new Argon2idPasswordHasher(new SecuritySettings
        {
            Argon2MemoryKibibytes = 2048,
            Argon2Iterations = 3
        }).Hash("correct horse battery staple");

        Assert.True(new Argon2idPasswordHasher(settings).Matches("correct horse battery staple", hash));
    }
}
