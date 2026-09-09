using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CategoryRepository(ZappyDbContext database) : ICategoryRepository
{
    public async Task<IReadOnlyList<Category>> InCatalogueOrder(CancellationToken cancellationToken) =>
        await database.Categories
            .AsNoTracking()
            .OrderBy(category => category.CatalogueOrder)
            .ToListAsync(cancellationToken);
}
