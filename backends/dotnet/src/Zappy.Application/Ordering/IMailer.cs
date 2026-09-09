using Zappy.Domain;

namespace Zappy.Application;

public interface IMailer
{
    Task SendOrderConfirmation(
        EmailAddress recipient,
        string customerName,
        Order order,
        CancellationToken cancellationToken);
}
