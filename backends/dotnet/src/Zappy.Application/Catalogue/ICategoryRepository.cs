using Zappy.Domain;

namespace Zappy.Application;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> InCatalogueOrder(CancellationToken cancellationToken);
}
