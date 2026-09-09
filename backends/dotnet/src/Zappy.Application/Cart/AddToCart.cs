using Zappy.Domain;

namespace Zappy.Application;

public sealed class AddToCart(
    VisitorCart visitorCart,
    IProductRepository products,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<CartResult> Execute(
        Visitor visitor,
        string productId,
        int? quantity,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var product = await products.WithId(productId, token);
                if (product is null)
                {
                    return CartResult.Refused(
                        cart,
                        [new UserError(UserErrorCode.ProductNotFound, "No product with that id exists.", "productId")]);
                }

                var outcome = cart.Add(product, quantity ?? 1, clock.Now);
                return outcome.Succeeded
                    ? CartResult.Changed(cart)
                    : CartResult.Refused(cart, outcome.Errors, product);
            },
            cancellationToken);
}
