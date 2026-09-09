using HotChocolate.Types;
using Zappy.Application;

namespace Zappy.Adapters.GraphQL;

[ExtendObjectType<Mutation>]
public sealed class DevelopmentMutation
{
    public async Task<ResetSeedPayload> ResetSeed(ResetSeed resetSeed, CancellationToken cancellationToken) =>
        new(true, await resetSeed.Execute(cancellationToken), []);
}
