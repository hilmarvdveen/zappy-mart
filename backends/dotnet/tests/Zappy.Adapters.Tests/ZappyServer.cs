using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Zappy.Adapters.Tests;

public sealed class ZappyServer : WebApplicationFactory<Program>
{
    private readonly string databaseFile = Path.Combine(
        Path.GetTempPath(),
        $"zappy-mart-test-{Guid.CreateVersion7():n}.db");

    public HttpClient AVisitor() => CreateClient();

    public HttpClient AVisitorWhoCarriesCookiesByHand() =>
        CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    public async Task<AnswerWithCookies> AskCarryingCookies(
        HttpClient visitor,
        string operation,
        string? cookie = null,
        string? accessToken = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/graphql")
        {
            Content = JsonContent.Create(new { query = operation })
        };

        request.Headers.Add("Origin", "http://localhost:5173");

        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        if (accessToken is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {accessToken}");
        }

        using var response = await visitor.SendAsync(request, TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var cookies = response.Headers.TryGetValues("Set-Cookie", out var values) ? values.ToList() : [];
        return new AnswerWithCookies(JsonDocument.Parse(body).RootElement.Clone(), cookies);
    }

    public async Task<JsonElement> Ask(
        HttpClient visitor,
        string operation,
        object? variables = null,
        string? origin = "http://localhost:5173",
        string? accessToken = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/graphql")
        {
            Content = JsonContent.Create(new { query = operation, variables })
        };

        if (origin is not null)
        {
            request.Headers.Add("Origin", origin);
        }

        if (accessToken is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {accessToken}");
        }

        using var response = await visitor.SendAsync(request, TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return JsonDocument.Parse(body).RootElement.Clone();
    }

    public async Task<string> ServedSchema()
    {
        using var visitor = CreateClient();
        return await visitor.GetStringAsync("/graphql?sdl", TestContext.Current.CancellationToken);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("Database:ConnectionString", $"Data Source={databaseFile}");
        builder.UseSetting("Seed:LoadAtStart", "true");
        builder.UseSetting("GraphQL:ExposeResetSeed", "true");
        builder.UseSetting("GraphQL:IncludeExceptionDetails", "true");
        builder.UseSetting("Security:Argon2MemoryKibibytes", "1024");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (!disposing)
        {
            return;
        }

        SqliteConnection.ClearAllPools();

        if (File.Exists(databaseFile))
        {
            File.Delete(databaseFile);
        }
    }
}
