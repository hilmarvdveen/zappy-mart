using System.Globalization;
using System.Text;
using Microsoft.Extensions.Logging;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Mail;

public sealed class ConsoleMailer(ILogger<ConsoleMailer> log) : IMailer
{
    public Task SendOrderConfirmation(
        EmailAddress recipient,
        string customerName,
        Order order,
        CancellationToken cancellationToken)
    {
        log.LogInformation(
            "Order confirmation for {OrderNumber} goes to a customer of Zappy Mart:\n{Body}",
            order.Number,
            BodyFor(customerName, order));

        return Task.CompletedTask;
    }

    private static string BodyFor(string customerName, Order order)
    {
        var body = new StringBuilder();
        body.AppendLine(CultureInfo.InvariantCulture, $"Dear {customerName},");
        body.AppendLine();
        body.AppendLine(CultureInfo.InvariantCulture, $"Thank you for order {order.Number}.");
        body.AppendLine();

        foreach (var line in order.Lines)
        {
            body.AppendLine(CultureInfo.InvariantCulture, $"  {line.Quantity} x {line.ProductName} at {line.UnitPrice} is {line.LineTotal}");
        }

        body.AppendLine();
        body.AppendLine(CultureInfo.InvariantCulture, $"  Subtotal {order.Subtotal}");
        body.AppendLine(CultureInfo.InvariantCulture, $"  Shipping {order.Shipping}");
        body.AppendLine(CultureInfo.InvariantCulture, $"  Discount {order.Discount}");
        body.AppendLine(CultureInfo.InvariantCulture, $"  Total {order.Total}");
        body.AppendLine();
        body.Append("Zappy Mart");
        return body.ToString();
    }
}
