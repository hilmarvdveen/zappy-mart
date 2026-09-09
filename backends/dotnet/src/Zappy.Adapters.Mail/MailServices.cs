using Microsoft.Extensions.DependencyInjection;
using Zappy.Application;

namespace Zappy.Adapters.Mail;

public static class MailServices
{
    public static IServiceCollection AddZappyMail(this IServiceCollection services)
    {
        services.AddScoped<IMailer, ConsoleMailer>();
        return services;
    }
}
