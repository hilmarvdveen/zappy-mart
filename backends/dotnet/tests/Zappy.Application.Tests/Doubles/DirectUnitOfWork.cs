using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class DirectUnitOfWork : IUnitOfWork
{
    public Task<TResult> RunInOneTransaction<TResult>(
        Func<CancellationToken, Task<TResult>> work,
        CancellationToken cancellationToken) =>
        work(cancellationToken);
}
