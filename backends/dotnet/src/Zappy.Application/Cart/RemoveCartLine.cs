using Zappy.Domain;

namespace Zappy.Application;

public sealed class RemoveCartLine(VisitorCart visitorCart, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<CartResult> Execute(Visitor visitor, string lineId, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var outcome = cart.RemoveLine(lineId, clock.Now);
                return outcome.Succeeded ? CartResult.Changed(cart) : CartResult.Refused(cart, outcome.Errors);
            },
            cancellationToken);
}
