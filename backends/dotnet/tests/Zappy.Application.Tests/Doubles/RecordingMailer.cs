using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class RecordingMailer : IMailer
{
    public List<Order> Sent { get; } = [];

    public Task SendOrderConfirmation(
        EmailAddress recipient,
        string customerName,
        Order order,
        CancellationToken cancellationToken)
    {
        Sent.Add(order);
        return Task.CompletedTask;
    }
}
