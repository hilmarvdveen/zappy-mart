using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class SessionUseCaseTests
{
    private readonly Store store = new(Store.AProduct());

    [Fact]
    public async Task ARefreshRotatesTheTokenAndKeepsTheSession()
    {
        var first = await SignIn();

        var refreshed = await store.RefreshSession.Execute(first.RefreshToken, CancellationToken.None);

        Assert.True(refreshed.Succeeded);
        Assert.NotEqual(first.RefreshToken, refreshed.Value!.RefreshToken);
        Assert.Equal(first.SessionId, refreshed.Value.SessionId);
        Assert.Equal(2, store.Sessions.RefreshTokens.Count);
    }

    [Fact]
    public async Task ARotatedTokenPresentedAgainRevokesTheWholeSession()
    {
        var first = await SignIn();
        await store.RefreshSession.Execute(first.RefreshToken, CancellationToken.None);

        var replayed = await store.RefreshSession.Execute(first.RefreshToken, CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionInvalid, replayed.Errors.Single().Code);
        Assert.False(store.Sessions.Sessions.Single().IsOpenAt(Store.Moment));
    }

    [Fact]
    public async Task AnUnknownTokenIsRefused()
    {
        var result = await store.RefreshSession.Execute("a token nobody issued", CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionInvalid, result.Errors.Single().Code);
    }

    [Fact]
    public async Task NoTokenAtAllIsRefused()
    {
        var result = await store.RefreshSession.Execute(null, CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionInvalid, result.Errors.Single().Code);
    }

    [Fact]
    public async Task LoggingOutClosesTheSessionOfTheRequest()
    {
        var authentication = await SignIn();

        var success = await store.LogOut.Execute(
            new Visitor(authentication.Customer.Id, authentication.SessionId, null),
            null,
            CancellationToken.None);

        Assert.True(success);
        Assert.False(store.Sessions.Sessions.Single().IsOpenAt(Store.Moment));
    }

    [Fact]
    public async Task LoggingOutTwiceIsNotAnError()
    {
        var authentication = await SignIn();
        var visitor = new Visitor(authentication.Customer.Id, authentication.SessionId, null);

        Assert.True(await store.LogOut.Execute(visitor, null, CancellationToken.None));
        Assert.True(await store.LogOut.Execute(visitor, null, CancellationToken.None));
    }

    [Fact]
    public async Task RevokingNeedsASignedInCustomer()
    {
        var result = await store.RevokeSession.Execute(Visitor.Anonymous, "session-01", CancellationToken.None);

        Assert.Equal(UserErrorCode.NotAuthenticated, result.Errors.Single().Code);
    }

    [Fact]
    public async Task ASessionOfSomebodyElseIsNotFound()
    {
        var authentication = await SignIn();

        var result = await store.RevokeSession.Execute(
            new Visitor(authentication.Customer.Id, authentication.SessionId, null),
            "a session of nobody",
            CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionNotFound, result.Errors.Single().Code);
        Assert.Equal("sessionId", result.Errors.Single().Field);
    }

    [Fact]
    public async Task ARevokedSessionLeavesTheList()
    {
        var authentication = await SignIn();

        var result = await store.RevokeSession.Execute(
            new Visitor(authentication.Customer.Id, authentication.SessionId, null),
            authentication.SessionId,
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task TwoSessionsOpenedInTheSameSecondListTheNewestFirst()
    {
        var first = await SignIn("Old laptop");
        var second = await SignIn("New phone");

        var open = await store.ListSessions.Execute(first.Customer.Id, CancellationToken.None);

        Assert.Equal(second.SessionId, open[0].Id);
        Assert.Equal(first.SessionId, open[1].Id);
        Assert.Equal(open[0].CreatedAt, open[1].CreatedAt);
    }

    private async Task<Authentication> SignIn(string device = "Chrome on Windows")
    {
        if (store.Customers.Customers.Count == 0)
        {
            return (await store.RegisterCustomer.Execute(
                Visitor.Anonymous,
                "jane@example.com",
                "Jane Doe",
                "correct horse battery staple",
                device,
                "127.0.0.1",
                CancellationToken.None)).Value!;
        }

        return (await store.LogIn.Execute(
            Visitor.Anonymous,
            "jane@example.com",
            "correct horse battery staple",
            device,
            "127.0.0.1",
            CancellationToken.None)).Value!;
    }
}
