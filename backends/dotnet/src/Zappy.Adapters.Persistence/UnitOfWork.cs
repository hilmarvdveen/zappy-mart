using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class UnitOfWork(ZappyDbContext database, ProductCatalogueVersion catalogueVersion) : IUnitOfWork
{
    public async Task<TResult> RunInOneTransaction<TResult>(
        Func<CancellationToken, Task<TResult>> work,
        CancellationToken cancellationToken)
    {
        if (database.Database.CurrentTransaction is not null)
        {
            return await work(cancellationToken);
        }

        TResult result;
        bool catalogueChanged;

        await using (var transaction = await database.Database.BeginTransactionAsync(cancellationToken))
        {
            result = await work(cancellationToken);
            catalogueChanged = database.ChangeTracker
                .Entries<Product>()
                .Any(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);

            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        if (catalogueChanged)
        {
            catalogueVersion.Bump();
        }

        return result;
    }
}
