using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class WishlistPayload(IReadOnlyList<Product> products, IReadOnlyList<UserError> errors)
{
    public IReadOnlyList<Product> Products { get; } = products;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static WishlistPayload From(WishlistResult result) => new(result.Products, result.Errors);
}
