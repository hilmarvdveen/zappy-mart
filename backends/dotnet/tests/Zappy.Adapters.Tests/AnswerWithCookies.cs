using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed record AnswerWithCookies(JsonElement Answer, IReadOnlyList<string> SetCookies)
{
    public string? CookieCalled(string name) => SetCookies
        .Select(header => header.Split(';')[0])
        .FirstOrDefault(pair => pair.StartsWith($"{name}=", StringComparison.Ordinal));
}
