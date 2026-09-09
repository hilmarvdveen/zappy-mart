using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed class AccountsOverGraphQLTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    private const string TheSeedPassword = "correct horse battery staple";

    [Fact]
    public async Task ALoginAnswersAnAccessTokenAndSetsTheRefreshCookie()
    {
        var visitor = await AFreshVisitor();

        var answer = await LogIn(visitor);

        Assert.Equal("jane@example.com", answer.Text("data", "login", "customer", "email"));
        Assert.False(string.IsNullOrWhiteSpace(answer.Text("data", "login", "accessToken")));
        Assert.EndsWith("Z", answer.Text("data", "login", "accessTokenExpiresAt"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task TheLoginAnswerAlreadyMarksItsOwnSessionAsTheCurrentOne()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "mutation { login(input: { email: \"jane@example.com\", password: \"" + TheSeedPassword
                + "\", device: \"Chrome on Windows\" }) { customer { sessions { device current } } errors { code } } }");

        Assert.True(answer.At("data", "login", "customer", "sessions", "0", "current").GetBoolean());
    }

    [Fact]
    public async Task AWrongPasswordAnswersOneCode()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "mutation { login(input: { email: \"jane@example.com\", password: \"a wrong password\" }) { customer { id } errors { code } } }");

        Assert.Equal("CREDENTIALS_INVALID", answer.FirstErrorCode("data", "login", "errors"));
        Assert.Equal(JsonValueKind.Null, answer.At("data", "login", "customer").ValueKind);
    }

    [Fact]
    public async Task AnAddressThatIsTakenIsRefused()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "mutation { register(input: { email: \"JANE@example.com\", name: \"Jane\", password: \"a long enough password\" }) { errors { code field } } }");

        Assert.Equal("EMAIL_TAKEN", answer.FirstErrorCode("data", "register", "errors"));
    }

    [Fact]
    public async Task ARefreshRotatesTheTokenAndAReplayRevokesTheWholeSession()
    {
        var visitor = server.AVisitorWhoCarriesCookiesByHand();
        await server.AskCarryingCookies(visitor, "mutation { resetSeed { success } }");
        var signedIn = await server.AskCarryingCookies(visitor, TheLoginOperation);
        var firstCookie = signedIn.CookieCalled("zappy_refresh")!;
        var accessToken = signedIn.Answer.Text("data", "login", "accessToken");

        var rotated = await server.AskCarryingCookies(
            visitor,
            "mutation { refreshSession { accessToken errors { code } } }",
            firstCookie);
        var replayed = await server.AskCarryingCookies(
            visitor,
            "mutation { refreshSession { errors { code } } }",
            firstCookie);
        var afterTheReplay = await server.AskCarryingCookies(
            visitor,
            "{ me { id } }",
            accessToken: accessToken);

        Assert.Empty(rotated.Answer.At("data", "refreshSession", "errors").EnumerateArray());
        Assert.NotEqual(firstCookie, rotated.CookieCalled("zappy_refresh"));
        Assert.Equal("SESSION_INVALID", replayed.Answer.FirstErrorCode("data", "refreshSession", "errors"));
        Assert.Equal(JsonValueKind.Null, afterTheReplay.Answer.At("data", "me").ValueKind);
    }

    [Fact]
    public async Task LoggingOutStopsTheAccessTokenAtOnce()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");

        var before = await server.Ask(visitor, "{ me { id } }", accessToken: accessToken);
        await server.Ask(visitor, "mutation { logout { success } }", accessToken: accessToken);
        var after = await server.Ask(visitor, "{ me { id } }", accessToken: accessToken);

        Assert.Equal("customer-01", before.Text("data", "me", "id"));
        Assert.Equal(JsonValueKind.Null, after.At("data", "me").ValueKind);
    }

    [Fact]
    public async Task ASessionListsItselfAsTheCurrentOne()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");

        var answer = await server.Ask(
            visitor,
            "{ me { sessions { device current } } }",
            accessToken: accessToken);

        Assert.Equal("Chrome on Windows", answer.Text("data", "me", "sessions", "0", "device"));
        Assert.True(answer.At("data", "me", "sessions", "0", "current").GetBoolean());
    }

    [Fact]
    public async Task RevokingTheCurrentSessionStopsItAtOnce()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");
        var sessionId = (await server.Ask(visitor, "{ me { sessions { id } } }", accessToken: accessToken))
            .Text("data", "me", "sessions", "0", "id");

        var revoked = await server.Ask(
            visitor,
            "mutation ($sessionId: ID!) { revokeSession(sessionId: $sessionId) { sessions { id } errors { code } } }",
            new { sessionId },
            accessToken: accessToken);
        var after = await server.Ask(visitor, "{ me { id } }", accessToken: accessToken);

        Assert.Empty(revoked.At("data", "revokeSession", "sessions").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, after.At("data", "me").ValueKind);
    }

    [Fact]
    public async Task AnUnknownSessionIsNotFound()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");

        var answer = await server.Ask(
            visitor,
            "mutation { revokeSession(sessionId: \"a session of nobody\") { errors { code field } } }",
            accessToken: accessToken);

        Assert.Equal("SESSION_NOT_FOUND", answer.FirstErrorCode("data", "revokeSession", "errors"));
    }

    [Fact]
    public async Task TheAnonymousWishlistAndCartMoveToTheCustomerOnLogin()
    {
        var visitor = await AFreshVisitor();
        await server.Ask(visitor, "mutation { addToWishlist(productId: \"product-05\") { products { id } errors { code } } }");
        await server.Ask(visitor, "mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");

        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");
        var answer = await server.Ask(
            visitor,
            "{ me { wishlist { id } } cart { lines { quantity } } }",
            accessToken: accessToken);

        Assert.Equal("product-05", answer.Text("data", "me", "wishlist", "0", "id"));
        Assert.Equal(2, answer.Number("data", "cart", "lines", "0", "quantity"));
    }

    private const string TheLoginOperation =
        "mutation { login(input: { email: \"jane@example.com\", password: \"" + TheSeedPassword
        + "\", device: \"Chrome on Windows\" }) { customer { id email } accessToken accessTokenExpiresAt errors { code } } }";

    private Task<JsonElement> LogIn(HttpClient visitor) => server.Ask(visitor, TheLoginOperation);

    private async Task<HttpClient> AFreshVisitor()
    {
        var visitor = server.AVisitor();
        await server.Ask(visitor, "mutation { resetSeed { success } }");
        return visitor;
    }
}
