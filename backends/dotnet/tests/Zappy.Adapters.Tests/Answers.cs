using System.Globalization;
using System.Text.Json;

namespace Zappy.Adapters.Tests;

public static class Answers
{
    public static JsonElement At(this JsonElement answer, params string[] path)
    {
        var found = answer;
        foreach (var step in path)
        {
            found = found.ValueKind == JsonValueKind.Array
                ? found[int.Parse(step, CultureInfo.InvariantCulture)]
                : found.GetProperty(step);
        }

        return found;
    }

    public static int Number(this JsonElement answer, params string[] path) => answer.At(path).GetInt32();

    public static string Text(this JsonElement answer, params string[] path) => answer.At(path).GetString()!;

    public static string FirstErrorCode(this JsonElement answer, params string[] path) =>
        answer.At(path).EnumerateArray().First().GetProperty("code").GetString()!;
}
