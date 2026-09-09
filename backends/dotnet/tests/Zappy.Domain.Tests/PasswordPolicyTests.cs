using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PasswordPolicyTests
{
    [Fact]
    public void APasswordOfTwelveCharactersPasses() =>
        Assert.Empty(PasswordPolicy.Check(new string('a', 12)));

    [Fact]
    public void AShorterPasswordIsRefused() =>
        Assert.Equal(UserErrorCode.PasswordTooShort, PasswordPolicy.Check(new string('a', 11)).Single().Code);

    [Fact]
    public void ALongerPasswordThanTheMaximumIsRefused() =>
        Assert.Equal(UserErrorCode.PasswordTooLong, PasswordPolicy.Check(new string('a', 129)).Single().Code);

    [Fact]
    public void APasswordOfTheMaximumLengthPasses() =>
        Assert.Empty(PasswordPolicy.Check(new string('a', 128)));

    [Fact]
    public void TheErrorNamesTheField() =>
        Assert.Equal("input.password", PasswordPolicy.Check("short").Single().Field);
}
