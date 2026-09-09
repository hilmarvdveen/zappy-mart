namespace Zappy.Application;

public interface ITokenIssuer
{
    AccessToken IssueAccessToken(string customerId, string sessionId, DateTimeOffset moment);

    string IssueRefreshToken();

    string HashRefreshToken(string refreshToken);
}
