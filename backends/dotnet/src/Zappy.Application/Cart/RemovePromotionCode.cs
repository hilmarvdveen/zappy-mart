using Zappy.Domain;

namespace Zappy.Application;

public sealed class RemovePromotionCode(VisitorCart visitorCart, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<CartResult> Execute(Visitor visitor, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token => CartResult.Changed((await visitorCart.FindOrStartOne(visitor, token)).RemovePromotion(clock.Now)),
            cancellationToken);
}
