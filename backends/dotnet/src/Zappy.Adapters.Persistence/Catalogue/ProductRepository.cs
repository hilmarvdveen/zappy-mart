using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class ProductRepository(ZappyDbContext database) : IProductRepository
{
    public async Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken)
    {
        var matching = specification.Parts().Aggregate(
            InCatalogueOrder(),
            (narrowed, part) => narrowed.Where(part));

        var totalCount = await matching.CountAsync(cancellationToken);

        var startAfter = afterProductId is null
            ? null
            : await database.Products
                .AsNoTracking()
                .Where(product => product.Id == afterProductId)
                .Select(product => (int?)product.CatalogueOrder)
                .SingleOrDefaultAsync(cancellationToken);

        if (startAfter is not null)
        {
            matching = matching.Where(product => product.CatalogueOrder > startAfter);
        }

        var page = await matching.Take(first + 1).ToListAsync(cancellationToken);
        return new Page<Product>([.. page.Take(first)], page.Count > first, totalCount);
    }

    public async Task<Product?> WithSlug(string slug, CancellationToken cancellationToken) =>
        await InCatalogueOrder().SingleOrDefaultAsync(product => product.Slug == slug, cancellationToken);

    public async Task<Product?> WithId(string id, CancellationToken cancellationToken) =>
        await database.Products
            .Include(product => product.Category)
            .SingleOrDefaultAsync(product => product.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken) =>
        ids.Count == 0
            ? []
            : await InCatalogueOrder().Where(product => ids.Contains(product.Id)).ToListAsync(cancellationToken);

    private IQueryable<Product> InCatalogueOrder() =>
        database.Products
            .AsNoTracking()
            .Include(product => product.Category)
            .OrderBy(product => product.CatalogueOrder);
}
