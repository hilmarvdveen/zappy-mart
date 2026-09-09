using Zappy.Domain;

namespace Zappy.Application;

public sealed class ChangeCartLineQuantity(VisitorCart visitorCart, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<CartResult> Execute(
        Visitor visitor,
        string lineId,
        int quantity,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var outcome = cart.ChangeLineQuantity(lineId, quantity, clock.Now);
                return outcome.Succeeded
                    ? CartResult.Changed(cart)
                    : CartResult.Refused(cart, outcome.Errors, cart.Lines.SingleOrDefault(line => line.Id == lineId)?.Product);
            },
            cancellationToken);
}
