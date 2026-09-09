using System.Text;

namespace Zappy.Application;

public static class Cursor
{
    public static string For(string id) => Convert.ToBase64String(Encoding.UTF8.GetBytes(id));

    public static string? IdentifierIn(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor))
        {
            return null;
        }

        Span<byte> decoded = new byte[cursor.Length];
        return Convert.TryFromBase64String(cursor, decoded, out var written)
            ? Encoding.UTF8.GetString(decoded[..written])
            : null;
    }
}
