using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Zappy.Application;

namespace Zappy.Adapters.Security;

public sealed class JwtTokenIssuer(SigningKeys keys, SecuritySettings settings) : ITokenIssuer
{
    private static readonly JsonWebTokenHandler Handler = new();

    public AccessToken IssueAccessToken(string customerId, string sessionId, DateTimeOffset moment)
    {
        var issuedAt = WholeSeconds(moment);
        var expiresAt = WholeSeconds(moment.Add(SessionLifetime.AccessToken));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            IssuedAt = issuedAt.UtcDateTime,
            NotBefore = issuedAt.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            Claims = new Dictionary<string, object>
            {
                ["sub"] = customerId,
                ["sid"] = sessionId
            },
            SigningCredentials = new SigningCredentials(keys.Key, SecurityAlgorithms.RsaSha256)
        };

        return new AccessToken(Handler.CreateToken(descriptor), expiresAt);
    }

    public string IssueRefreshToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));

    public string HashRefreshToken(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken))).ToLowerInvariant();

    private static DateTimeOffset WholeSeconds(DateTimeOffset moment) =>
        new(moment.Ticks - (moment.Ticks % TimeSpan.TicksPerSecond), moment.Offset);
}
