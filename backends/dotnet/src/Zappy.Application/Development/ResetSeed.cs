namespace Zappy.Application;

public sealed class ResetSeed(ISeedLoader seedLoader, IRateLimiter rateLimiter)
{
    public async Task<int> Execute(CancellationToken cancellationToken)
    {
        rateLimiter.Forget();
        return await seedLoader.LoadFreshSeed(cancellationToken);
    }
}
