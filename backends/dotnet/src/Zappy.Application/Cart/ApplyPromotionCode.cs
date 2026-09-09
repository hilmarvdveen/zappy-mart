using Zappy.Domain;

namespace Zappy.Application;

public sealed class ApplyPromotionCode(
    VisitorCart visitorCart,
    IPromotionCodeRepository promotionCodes,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<CartResult> Execute(Visitor visitor, string code, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var promotionCode = await promotionCodes.WithCode(PromotionCode.Normalise(code), token);
                if (promotionCode is null)
                {
                    return CartResult.Refused(
                        cart,
                        [new UserError(UserErrorCode.CodeUnknown, "No promotion code with that text exists.", "code")]);
                }

                var outcome = cart.Apply(promotionCode, clock.Now);
                return outcome.Succeeded ? CartResult.Changed(cart) : CartResult.Refused(cart, outcome.Errors);
            },
            cancellationToken);
}
