using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListCategories(ICategoryRepository categories)
{
    public Task<IReadOnlyList<Category>> Execute(CancellationToken cancellationToken) =>
        categories.InCatalogueOrder(cancellationToken);
}
