using Microsoft.AspNetCore.Http;
using Zappy.Application;

namespace Zappy.Adapters.GraphQL;

public sealed class VisitorOfTheRequest(IHttpContextAccessor httpContextAccessor, GraphQLSettings settings)
{
    private static readonly TimeSpan HowLongACartCookieLives = TimeSpan.FromDays(30);

    private const string SessionStartedByThisRequest = "zappy.session-started-by-this-request";

    public Visitor Current
    {
        get
        {
            var context = Context;
            return new Visitor(
                context.User.FindFirst("sub")?.Value,
                SessionOf(context) ?? context.User.FindFirst("sid")?.Value,
                context.Request.Cookies[Cookies.Cart]);
        }
    }

    public string? PresentedRefreshToken => Context.Request.Cookies[Cookies.Refresh];

    public string ClientAddress => Context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private HttpContext Context => httpContextAccessor.HttpContext
        ?? throw new InvalidOperationException("A Zappy Mart resolver ran outside an HTTP request.");

    public string DeviceFor(string? asked)
    {
        if (!string.IsNullOrWhiteSpace(asked))
        {
            return asked.Trim();
        }

        var userAgent = Context.Request.Headers.UserAgent.ToString();
        return string.IsNullOrWhiteSpace(userAgent) ? "Unknown device" : userAgent;
    }

    public void RememberSession(string sessionId) => Context.Items[SessionStartedByThisRequest] = sessionId;

    private static string? SessionOf(HttpContext context) =>
        context.Items.TryGetValue(SessionStartedByThisRequest, out var started) ? started as string : null;

    public void RememberCart(string cartId)
    {
        if (Context.Request.Cookies[Cookies.Cart] == cartId)
        {
            return;
        }

        Context.Response.Cookies.Append(Cookies.Cart, cartId, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.Add(HowLongACartCookieLives)
        });
    }

    public void ForgetCart() =>
        Context.Response.Cookies.Delete(Cookies.Cart, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });

    public void RememberRefreshToken(string refreshToken, DateTimeOffset expiresAt) =>
        Context.Response.Cookies.Append(Cookies.Refresh, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = settings.Path,
            Expires = expiresAt
        });

    public void ForgetRefreshToken() =>
        Context.Response.Cookies.Delete(Cookies.Refresh, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = settings.Path
        });
}
