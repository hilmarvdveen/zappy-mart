using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderPayload(Order? order, IReadOnlyList<UserError> errors)
{
    public Order? Order { get; } = order;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static OrderPayload From(Zappy.Domain.Result<Order> result) => new(result.Value, result.Errors);
}
