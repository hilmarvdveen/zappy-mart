using Zappy.Domain;

namespace Zappy.Application;

public sealed class RecordPromotionUse(IPromotionCodeRepository promotionCodes, IUnitOfWork unitOfWork)
    : IDomainEventHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced orderPlaced, CancellationToken cancellationToken)
    {
        if (orderPlaced.PromotionCode is null)
        {
            return;
        }

        await unitOfWork.RunInOneTransaction(
            async token =>
            {
                var promotionCode = await promotionCodes.WithCode(orderPlaced.PromotionCode, token);
                promotionCode?.RecordUse();
                return true;
            },
            cancellationToken);
    }
}
