using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Zappy.Adapters.Security;
using Zappy.Application;

namespace Zappy.Host;

public sealed class BearerTokenSetup(SecuritySettings settings, SigningKeys keys)
    : IConfigureNamedOptions<JwtBearerOptions>
{
    public void Configure(string? name, JwtBearerOptions options) => Configure(options);

    public void Configure(JwtBearerOptions options)
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = settings.Issuer,
            ValidAudience = settings.Audience,
            IssuerSigningKey = keys.Key,
            ClockSkew = TimeSpan.FromSeconds(5),
            NameClaimType = "sub"
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = TheSessionMustStillBeOpen
        };
    }

    private static async Task TheSessionMustStillBeOpen(TokenValidatedContext context)
    {
        var sessionId = context.Principal?.FindFirst("sid")?.Value;
        if (sessionId is null)
        {
            context.Fail("The access token names no session.");
            return;
        }

        var services = context.HttpContext.RequestServices;
        var sessions = services.GetRequiredService<ISessionRepository>();
        var clock = services.GetRequiredService<IClock>();
        var session = await sessions.WithId(sessionId, context.HttpContext.RequestAborted);

        if (session is null || !session.IsOpenAt(clock.Now))
        {
            context.Fail("The session was logged out or revoked.");
        }
    }
}
