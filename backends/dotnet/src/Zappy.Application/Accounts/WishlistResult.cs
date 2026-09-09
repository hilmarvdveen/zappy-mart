using Zappy.Domain;

namespace Zappy.Application;

public sealed record WishlistResult(
    IReadOnlyList<Product> Products,
    string? AnonymousCartId,
    IReadOnlyList<UserError> Errors)
{
    public static WishlistResult Changed(IReadOnlyList<Product> products, string? anonymousCartId) =>
        new(products, anonymousCartId, []);

    public static WishlistResult Refused(
        IReadOnlyList<Product> products,
        string? anonymousCartId,
        UserErrorCode code,
        string message,
        string? field = null) =>
        new(products, anonymousCartId, [new UserError(code, message, field)]);
}
