namespace Zappy.Application;

public interface ISeedLoader
{
    Task<int> LoadFreshSeed(CancellationToken cancellationToken);
}
