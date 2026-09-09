namespace Zappy.Application;

public interface IUnitOfWork
{
    Task<TResult> RunInOneTransaction<TResult>(
        Func<CancellationToken, Task<TResult>> work,
        CancellationToken cancellationToken);
}
