using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ResetSeedPayload(bool success, int loadedProducts, IReadOnlyList<UserError> errors)
{
    public bool Success { get; } = success;

    public int LoadedProducts { get; } = loadedProducts;

    public IReadOnlyList<UserError> Errors { get; } = errors;
}
