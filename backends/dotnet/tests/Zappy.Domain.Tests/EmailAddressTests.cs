using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class EmailAddressTests
{
    [Fact]
    public void AnAddressIsNormalisedToLowerCase() =>
        Assert.Equal("jane@example.com", EmailAddress.Create("  JANE@Example.COM ")!.Value);

    [Theory]
    [InlineData("jane")]
    [InlineData("@example.com")]
    [InlineData("jane@")]
    [InlineData("jane@example")]
    [InlineData("jane@@example.com")]
    [InlineData("ja ne@example.com")]
    public void AnAddressThatIsNotAnAddressCannotExist(string value) =>
        Assert.Null(EmailAddress.Create(value));

    [Fact]
    public void TwoAddressesOfTheSameTextAreEqual() =>
        Assert.Equal(EmailAddress.Create("jane@example.com"), EmailAddress.Create("Jane@Example.com"));
}
