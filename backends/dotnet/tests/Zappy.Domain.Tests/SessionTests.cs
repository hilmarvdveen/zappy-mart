using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class SessionTests
{
    private static Session ASession(int creationOrder = 1) =>
        new("session-01", "customer-01", "Chrome on Windows", creationOrder, Moments.Now, Moments.Now.AddDays(30));

    [Fact]
    public void AFreshSessionIsOpen() => Assert.True(ASession().IsOpenAt(Moments.Now));

    [Fact]
    public void ARevokedSessionIsClosedAtOnce()
    {
        var session = ASession();

        session.Revoke(Moments.Now);

        Assert.False(session.IsOpenAt(Moments.Now));
    }

    [Fact]
    public void RevokingTwiceKeepsTheFirstMoment()
    {
        var session = ASession();

        session.Revoke(Moments.Now);
        session.Revoke(Moments.Now.AddHours(1));

        Assert.Equal(Moments.Now, session.RevokedAt);
    }

    [Fact]
    public void AnExpiredSessionIsClosed() =>
        Assert.False(ASession().IsOpenAt(Moments.Now.AddDays(31)));

    [Fact]
    public void ASessionRecordsTheOrderItWasCreatedIn() =>
        Assert.Equal(7, ASession(7).CreationOrder);

    [Fact]
    public void ARotatedTokenIsRecognisedAsUsed()
    {
        var token = new RefreshToken("token-01", "session-01", "a hash", Moments.Now, Moments.Now.AddDays(30));

        Assert.False(token.WasAlreadyUsed);

        token.Rotate(Moments.Now);

        Assert.True(token.WasAlreadyUsed);
    }
}
