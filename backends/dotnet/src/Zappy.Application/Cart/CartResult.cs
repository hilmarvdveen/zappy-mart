using Zappy.Domain;

namespace Zappy.Application;

public sealed record CartResult(Cart Cart, int? AvailableStock, IReadOnlyList<UserError> Errors)
{
    public static CartResult Changed(Cart cart) => new(cart, null, []);

    public static CartResult Refused(Cart cart, IReadOnlyList<UserError> errors, Product? product = null) =>
        new(cart, errors.Any(error => error.Code == UserErrorCode.OutOfStock) ? product?.Stock : null, errors);
}
