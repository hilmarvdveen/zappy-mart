using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CartPayload(Cart? cart, int? availableStock, IReadOnlyList<UserError> errors)
{
    public Cart? Cart { get; } = cart;

    public int? AvailableStock { get; } = availableStock;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static CartPayload From(CartResult result) =>
        new(result.Cart, result.AvailableStock, result.Errors);
}
