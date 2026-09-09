using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed class OriginCheckTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    [Fact]
    public async Task AMutationWithoutAnOriginIsRefusedBeforeTheResolver()
    {
        var answer = await server.Ask(
            server.AVisitor(),
            "mutation { addToCart(productId: \"product-01\") { cart { id } } }",
            origin: null);

        Assert.Equal("ORIGIN_NOT_ALLOWED", answer.Text("errors", "0", "extensions", "code"));
        Assert.False(answer.TryGetProperty("data", out _));
    }

    [Fact]
    public async Task AMutationFromAForeignOriginIsRefused()
    {
        var answer = await server.Ask(
            server.AVisitor(),
            "mutation { logout { success } }",
            origin: "http://evil.example");

        Assert.Equal("ORIGIN_NOT_ALLOWED", answer.Text("errors", "0", "extensions", "code"));
    }

    [Theory]
    [InlineData("http://localhost:5173")]
    [InlineData("http://localhost:3001")]
    [InlineData("http://localhost:4200")]
    public async Task AMutationFromEveryFrontendOfTheFamilyRuns(string origin)
    {
        var answer = await server.Ask(server.AVisitor(), "mutation { logout { success } }", origin: origin);

        Assert.True(answer.At("data", "logout", "success").GetBoolean());
    }

    [Fact]
    public async Task AQueryNeedsNoOrigin()
    {
        var answer = await server.Ask(server.AVisitor(), "{ categories { slug } }", origin: null);

        Assert.Equal(4, answer.At("data", "categories").GetArrayLength());
    }

    [Fact]
    public async Task AMutationInADocumentWithSeveralOperationsIsStillChecked()
    {
        var answer = await server.Ask(
            server.AVisitor(),
            "query Read { categories { slug } } mutation Change { logout { success } }",
            variables: null,
            origin: null);

        Assert.Equal(JsonValueKind.Array, answer.At("errors").ValueKind);
    }
}
