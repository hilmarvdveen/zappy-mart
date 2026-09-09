using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Zappy.Application;

namespace Zappy.Adapters.Security;

public static class SecurityServices
{
    public static IServiceCollection AddZappySecurity(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = new SecuritySettings();
        configuration.GetSection(SecuritySettings.Section).Bind(settings);

        services.AddSingleton(settings);
        services.AddSingleton<SigningKeys>();
        services.AddSingleton<ITokenIssuer, JwtTokenIssuer>();
        services.AddSingleton<IPasswordHasher, Argon2idPasswordHasher>();
        services.AddSingleton<IRateLimiter, InMemoryRateLimiter>();

        return services;
    }
}
