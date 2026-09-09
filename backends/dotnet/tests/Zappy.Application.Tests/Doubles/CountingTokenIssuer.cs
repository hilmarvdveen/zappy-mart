using System.Globalization;
using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class CountingTokenIssuer : ITokenIssuer
{
    private int issued;

    public AccessToken IssueAccessToken(string customerId, string sessionId, DateTimeOffset moment) =>
        new($"access-for-{customerId}-in-{sessionId}", moment.Add(SessionLifetime.AccessToken));

    public string IssueRefreshToken()
    {
        issued += 1;
        return string.Create(CultureInfo.InvariantCulture, $"refresh-{issued}");
    }

    public string HashRefreshToken(string refreshToken) => $"hash-of-{refreshToken}";
}
